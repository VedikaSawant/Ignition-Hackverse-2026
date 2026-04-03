import os
from datetime import datetime
import tempfile
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import google.generativeai as genai
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

import pandas as pd
from sqlalchemy.orm import Session
from models import User, Medicine, DoseLog, HealthMetric
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# Initialize Gemini
if os.environ.get("GEMINI_API_KEY"):
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])

def generate_clinical_summary(patient_data):
    """
    Generate a short clinical summary using Gemini.
    """
    med_list = ", ".join([f"{m['name']} ({m['adherence']}%)" for m in patient_data.get('med_breakdown', [])])
    prompt = (
        f"You are a medical consultant. Analyze this patient's adherence for the last 7 days.\n"
        f"Patient: {patient_data['name']}\n"
        f"Conditions: {patient_data['conditions']}\n"
        f"Overall Adherence: {patient_data['adherence_percent']}%\n"
        f"Risk Level: {patient_data['risk_level']}\n"
        f"Medicine Breakdown: {med_list}\n"
        f"Total Doses: {patient_data['total']} (Taken: {patient_data['taken']}, Missed: {patient_data['missed']})\n\n"
        "Write a concise 3-4 sentence clinical insight for their doctor. "
        "Highlight specific medicines if they have low adherence and suggest a course of action (e.g., follow-up call, medication review)."
    )
    
    try:
        # Using a reliable model name
        model = genai.GenerativeModel("gemini-1.5-flash") 
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        return "Automatic clinical summary could not be generated at this time. Please review the raw statistics below for clinical assessment."

def create_pdf_report(patient_data, ai_summary):
    """
    Create an informative PDF using reportlab.
    Returns path to the generated PDF.
    """
    temp_dir = tempfile.gettempdir()
    pdf_path = os.path.join(temp_dir, f"report_{patient_data['id']}.pdf")
    
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, leftMargin=50, rightMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    # Custom styles
    header_style = ParagraphStyle('Header', parent=styles['Heading1'], fontSize=22, spaceAfter=20, textColor=colors.HexColor("#1E3A8A"))
    sub_header_style = ParagraphStyle('SubHeader', parent=styles['Heading2'], fontSize=16, spaceBefore=15, spaceAfter=10, textColor=colors.HexColor("#1E40AF"))
    info_style = ParagraphStyle('Info', parent=styles['Normal'], spaceAfter=6, fontSize=11)
    ai_box_style = ParagraphStyle(
        'AIBox', parent=styles['Normal'],
        backColor=colors.HexColor("#EFF6FF"),
        borderColor=colors.HexColor("#3B82F6"),
        borderWidth=1,
        borderPadding=12,
        spaceBefore=10,
        spaceAfter=20,
        leading=16,
        fontSize=11,
        textColor=colors.HexColor("#1E3A8A")
    )
    
    elements = []
    
    # 1. Header & Patient Info
    elements.append(Paragraph(f"MediTrack: Clinical Adherence Report", header_style))
    elements.append(Paragraph(f"<b>Patient:</b> {patient_data['name']}", info_style))
    elements.append(Paragraph(f"<b>Report Period:</b> Last 7 Days (Generated: {datetime.utcnow().strftime('%Y-%m-%d')})", info_style))
    elements.append(Paragraph(f"<b>Primary Condition(s):</b> {patient_data['conditions'] or 'Not specified'}", info_style))
    elements.append(Spacer(1, 10))
    
    # 2. AI Summary Box (High Visibility)
    elements.append(Paragraph("AI-Generated Clinical Insight", sub_header_style))
    elements.append(Paragraph(ai_summary, ai_box_style))
    
    # 3. Overall Performance Stats
    elements.append(Paragraph("Executive Adherence Summary", sub_header_style))
    risk = patient_data['risk_level']
    risk_color = colors.green if risk == 'Low' else (colors.orange if risk == 'Moderate' else colors.red)
    
    summary_data = [
        ['Metric', 'Value', 'Assessment'],
        ['Total Scheduled Doses', str(patient_data['total']), '—'],
        ['Doses Taken', str(patient_data['taken']), '—'],
        ['Doses Missed', str(patient_data['missed']), '—'],
        ['Weekly Adherence Rate', f"{patient_data['adherence_percent']}%", 'Good' if patient_data['adherence_percent']>=80 else 'Action Required'],
        ['Clinical Risk Level', risk, risk.upper()]
    ]
    
    summary_table = Table(summary_data, colWidths=[180, 100, 150])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('TEXTCOLOR', (1, 5), (1, 5), risk_color),
        ('TEXTCOLOR', (2, 5), (2, 5), risk_color),
        ('FONTNAME', (1, 5), (-1, 5), 'Helvetica-Bold'),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # 4. Medication Breakdown
    if patient_data.get('med_breakdown'):
        elements.append(Paragraph("Medication-Specific Breakdown", sub_header_style))
        med_data = [['Medication Name', 'Scheduled', 'Taken', 'Adherence %']]
        for m in patient_data['med_breakdown']:
            med_data.append([m['name'], str(m['total']), str(m['taken']), f"{m['adherence']}%"])
        
        med_table = Table(med_data, colWidths=[200, 70, 70, 90])
        med_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#64748B")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ]))
        elements.append(med_table)
        elements.append(Spacer(1, 20))

    # 5. Daily Adherence Trend
    if patient_data.get('daily_trend'):
        elements.append(Paragraph("7-Day Adherence Trend", sub_header_style))
        trend_data = [['Date', 'Adherence %', 'Visual Indicator']]
        for d in patient_data['daily_trend']:
            adherence = d['adherence']
            # Determine color based on threshold
            color = "#22C55E" if adherence >= 80 else ("#F59E0B" if adherence >= 50 else "#EF4444")
            
            # Create a colored text-based bar using font tags
            bar_len = int(adherence / 10)
            filled_part = f'<font color="{color}">' + ("█" * bar_len) + '</font>'
            empty_part = f'<font color="#E2E8F0">' + ("█" * (10 - bar_len)) + '</font>'
            
            bar_paragraph = Paragraph(filled_part + empty_part, styles['Normal'])
            trend_data.append([d['date'], f"{adherence}%", bar_paragraph])
        
        trend_table = Table(trend_data, colWidths=[120, 100, 210])
        trend_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#94A3B8")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (2, 1), (2, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(trend_table)
        
        # Color Legend
        legend_style = ParagraphStyle('Legend', parent=styles['Italic'], fontSize=9, textColor=colors.grey, spaceBefore=5)
        legend_text = (
            '<b>Legend:</b> '
            '<font color="#22C55E">█ High (≥80%)</font> &nbsp;&nbsp; '
            '<font color="#F59E0B">█ Moderate (50-79%)</font> &nbsp;&nbsp; '
            '<font color="#EF4444">█ Low (<50%)</font>'
        )
        elements.append(Paragraph(legend_text, legend_style))

    # Build
    doc.build(elements)
    
    return pdf_path


def send_report_email(doctor_email, patient_name, risk_level, pdf_path):
    """
    Send the PDF via SMTP.
    """
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    
    if not smtp_user or not smtp_pass or not doctor_email:
        print("SMTP credentials or Doctor email missing. Skipping email send.")
        return False
        
    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = doctor_email
    msg['Subject'] = f"Weekly Report: {patient_name} — Risk: {risk_level.upper()}"
    
    body = "Doctor,\n\nPlease find the attached AI-generated weekly adherence report for your patient.\n\nBest regards,\nMediTrack System"
    msg.attach(MIMEText(body, 'plain'))
    
    with open(pdf_path, "rb") as f:
        part = MIMEApplication(f.read(), Name=os.path.basename(pdf_path))
        part['Content-Disposition'] = f'attachment; filename="{os.path.basename(pdf_path)}"'
        msg.attach(part)
        
    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"Email sent successfully to {doctor_email}")
        return True
    except Exception as e:
        print(f"Failed to send email to {doctor_email}: {e}")
        return False


def send_patient_reminder_email(patient_email, patient_name, medicine_name, scheduled_time, miss_prob=0.2, behavioral_context=None):
    """
    Send a smart, Gemini-drafted reminder directly to the patient.
    """
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    
    if not smtp_user or not smtp_pass or not patient_email:
        return False

    is_high_risk = miss_prob >= 0.45
    prompt = f"""You are a caring personalized AI health assistant named Aria. 
Draft a 2-sentence medication reminder email for {patient_name}.
Medicine: {medicine_name} at {scheduled_time}.
High Risk of Missing: {'Yes' if is_high_risk else 'No'}
Behavioral Context: {behavioral_context if behavioral_context else 'None'}

If high risk, be more encouraging and mention why (e.g. routine drift or weekend pattern).
Plain text only. No subject line.

Email Body:"""

    content = f"Hi {patient_name}, it's time for your {medicine_name} at {scheduled_time}! Let's stay on track with your health today."
    if os.environ.get("GEMINI_API_KEY"):
        try:
            model = genai.GenerativeModel("gemini-1.5-flash") 
            resp = model.generate_content(prompt)
            content = resp.text.strip()
        except:
            pass

    msg = MIMEText(content)
    msg['From'] = f"MediTrack Aria <{smtp_user}>"
    msg['To'] = patient_email
    msg['Subject'] = f"{'⚠️ HIGH PRIORITY: ' if is_high_risk else ''}Medication Reminder: {medicine_name}"
    
    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Reminder email failed: {e}")
        return False


def get_patient_weekly_stats(db: Session, patient_id: int):
    """
    Step 1 & 2: Fetch data and calculate stats using pandas.
    """
    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        return None

    today = datetime.utcnow().date()
    start_date = (today - timedelta(days=6)).isoformat() # Last 7 days including today
    
    # Fetch logs
    logs = db.query(DoseLog).filter(
        DoseLog.user_id == patient_id,
        DoseLog.scheduled_time >= start_date
    ).all()

    if not logs:
        return {
            "id": patient.id,
            "name": patient.name,
            "conditions": patient.conditions,
            "total": 0,
            "taken": 0,
            "missed": 0,
            "adherence_percent": 0,
            "risk_level": "Low",
            "med_breakdown": [],
            "daily_trend": []
        }

    # Load into DataFrame
    df = pd.DataFrame([{
        "medicine_id": l.medicine_id,
        "status": l.status,
        "date": l.scheduled_time.split(' ')[0]
    } for l in logs])

    total = len(df)
    taken = len(df[df['status'] == 'taken'])
    missed = len(df[df['status'].isin(['missed', 'pending'])]) # In this context, past pending are missed
    adherence = round((taken / total) * 100) if total > 0 else 0

    # Risk level = if adherence ≥ 80% → Low, 50–79% → Moderate, below 50% → High
    if adherence >= 80:
        risk_level = "Low"
    elif adherence >= 50:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    # Med breakdown
    med_breakdown = []
    medicines = db.query(Medicine).filter(Medicine.user_id == patient_id, Medicine.is_active == True).all()
    for med in medicines:
        med_df = df[df['medicine_id'] == med.id]
        m_total = len(med_df)
        m_taken = len(med_df[med_df['status'] == 'taken'])
        if m_total > 0:
            med_breakdown.append({
                "name": med.name,
                "total": m_total,
                "taken": m_taken,
                "adherence": round((m_taken / m_total) * 100)
            })

    # Daily trend (last 7 days)
    daily_trend = []
    for i in range(6, -1, -1):
        d_str = (today - timedelta(days=i)).isoformat()
        day_df = df[df['date'] == d_str]
        d_total = len(day_df)
        d_taken = len(day_df[day_df['status'] == 'taken'])
        daily_trend.append({
            "date": d_str,
            "adherence": round((d_taken / d_total) * 100) if d_total > 0 else 0
        })

    return {
        "id": patient.id,
        "name": patient.name,
        "conditions": patient.conditions,
        "total": total,
        "taken": taken,
        "missed": missed,
        "adherence_percent": adherence,
        "risk_level": risk_level,
        "med_breakdown": med_breakdown,
        "daily_trend": daily_trend
    }

def process_and_send_patient_report(db: Session, patient_id: int):
    """
    Unified flow: DB -> Stats -> LLM -> PDF -> Email
    """
    print(f"📊 Processing weekly report for patient ID: {patient_id}")
    
    # 1. Get stats
    stats = get_patient_weekly_stats(db, patient_id)
    if not stats:
        print(f"⚠️ Could not find stats for patient {patient_id}")
        return False

    # 2. Generate AI summary
    summary = generate_clinical_summary(stats)
    
    # 3. Create PDF
    pdf_path = create_pdf_report(stats, summary)
    
    # 4. Find doctor email
    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient or not patient.linked_doctor_id:
        print(f"⚠️ Patient {patient_id} has no linked doctor.")
        return False
        
    doctor = db.query(User).filter(User.id == patient.linked_doctor_id).first()
    if not doctor or not doctor.email:
        print(f"⚠️ Linked doctor for patient {patient_id} has no email.")
        return False

    # 5. Send email
    success = send_report_email(doctor.email, stats['name'], stats['risk_level'], pdf_path)
    
    # Cleanup temp file
    try:
        os.remove(pdf_path)
    except:
        pass
        
    return success
