import axios from 'axios';

const API_URL = "http://localhost:5000/api/send-email";

// Professional Email Header/Footer Wrapper
const emailTemplate = (content: string) => `
  <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
      <div style="background: #000000; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: -1px;">Fixit Lanka</h1>
        <p style="color: rgba(255,255,255,0.6); margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Road Development Authority</p>
      </div>
      <div style="padding: 40px 30px;">
        ${content}
      </div>
      <div style="padding: 20px; text-align: center; background: #f1f5f9; color: #94a3b8; font-size: 11px;">
        © 2026 Fixit Lanka Operations. All rights reserved.<br/>
        Institutional Communication - Road Development Authority (RDA)
      </div>
    </div>
  </div>
`;

// 1. Worker Registration Email (Updated to 4-Digit Passcode)
export const sendWorkerWelcomeEmail = async (workerData: any) => {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome to the Force, ${workerData.fullName}</h2>
    <p style="line-height: 1.6;">Your registration as an <b>RDA Field Worker</b> is complete. Please download the Fixit Lanka Mobile App and use the stable login passcode provided below.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Mobile Access Credentials</p>
      <div style="font-size: 15px; margin-bottom: 8px;">Worker ID: <strong style="color: #000; font-family: monospace;">${workerData.staffId}</strong></div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Login Passcode</div>
      <div style="font-size: 32px; font-weight: bold; color: #000; letter-spacing: 4px;">${workerData.password}</div>
    </div>
    
    <p style="font-size: 13px; color: #64748b;">This is your permanent login passcode. Please keep it secure. For assistance, contact your Unit Supervisor.</p>
  `;
  try {
    const response = await axios.post(API_URL, {
      email: workerData.email,
      subject: "Fixit Lanka | Worker Access Credentials",
      html: emailTemplate(content)
    });
    return response.data;
  } catch (error) {
    console.error("Worker email failed", error);
    return { success: false };
  }
};

// 2. Supervisor Initial Registration Email (Confirmation only)
export const sendSupervisorWelcomeEmail = async (supData: any) => {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Registration Confirmed</h2>
    <p style="line-height: 1.6;">Hello ${supData.fullName}, you have been successfully registered as a <b>Team Supervisor</b>.</p>
    
    <div style="border-left: 4px solid #000; padding: 15px 20px; background: #f8fafc; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px;">Personnel ID: <strong>${supData.staffId}</strong></p>
    </div>
    
    <p style="line-height: 1.6;">You are currently in the <b>Available Pool</b>. You will receive a separate automated email containing your <b>Unit ID and Stable Passcode</b> once you are assigned to an active maintenance unit.</p>
  `;
  try {
    const response = await axios.post(API_URL, {
      email: supData.email,
      subject: "Fixit Lanka | Supervisor Account Verified",
      html: emailTemplate(content)
    });
    return response.data;
  } catch (error) {
    console.error("Supervisor welcome failed", error);
    return { success: false };
  }
};

// 3. Team Assignment Email (Unit ID + Passcode)
export const sendTeamAssignmentEmail = async (assignData: any) => {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <span style="background: #ecfdf5; color: #059669; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">Active Assignment</span>
    </div>
    <h2 style="color: #0f172a; margin-top: 0; text-align: center;">Unit Activation: ${assignData.teamName}</h2>
    <p style="text-align: center; color: #64748b;">You have been assigned as the Lead Supervisor for this unit.</p>
    
    <div style="background: #000; border-radius: 16px; padding: 30px; margin: 30px 0; text-align: center; color: white;">
      <p style="margin: 0 0 15px 0; font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.5); letter-spacing: 1px;">Mobile App Access</p>
      <div style="font-size: 16px; margin-bottom: 10px;">Unit ID: <strong style="color: #fff; font-family: monospace;">${assignData.teamId}</strong></div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 5px;">LOGIN PASSCODE</div>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${assignData.passcode}</div>
    </div>
    
    <ul style="padding: 0; list-style: none; font-size: 13px; color: #475569;">
      <li style="margin-bottom: 8px;">✅ Access real-time repair requests</li>
      <li style="margin-bottom: 8px;">✅ Manage field worker attendance</li>
      <li style="margin-bottom: 8px;">✅ Submit repair completion reports</li>
    </ul>
  `;
  try {
    const response = await axios.post(API_URL, {
      email: assignData.email,
      subject: `Urgent | Team Assignment: ${assignData.teamName}`,
      html: emailTemplate(content)
    });
    return response.data;
  } catch (error) {
    console.error("Assignment email failed", error);
    return { success: false };
  }
};
// 4. Supervisor Replacement Email (Leadership Transfer)
export const sendSupervisorReplacementEmail = async (transferData: any) => {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <span style="background: #fef2f2; color: #dc2626; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: 1px solid #fee2e2;">Urgent Transfer</span>
    </div>
    <h2 style="color: #0f172a; margin-top: 0; text-align: center;">Leadership Handover: ${transferData.teamName}</h2>
    <p style="text-align: center; color: #64748b; line-height: 1.6;">
      Due to operational adjustments, you have been reassigned as the Lead Supervisor for this unit.<br/>
      <b>Existing fieldwork schedules and crew assignments remain active.</b>
    </p>
    
    <div style="background: #000; border-radius: 16px; padding: 30px; margin: 30px 0; text-align: center; color: white;">
      <p style="margin: 0 0 15px 0; font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.5); letter-spacing: 1px;">Continuing Unit Credentials</p>
      <div style="font-size: 16px; margin-bottom: 10px;">Unit ID: <strong style="color: #fff; font-family: monospace;">${transferData.teamId}</strong></div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 5px;">ACCESS PASSCODE</div>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${transferData.passcode}</div>
    </div>
    
    <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #c2410c;">
        <strong>Notice:</strong> The previous supervisor has been relieved. Please verify active job status immediately upon login.
      </p>
    </div>
  `;

  try {
    const response = await axios.post(API_URL, {
      email: transferData.email,
      subject: `Urgent | Operational Leadership Transfer: ${transferData.teamName}`,
      html: emailTemplate(content)
    });
    return response.data;
  } catch (error) {
    console.error("Replacement email failed", error);
    return { success: false };
  }
};

// 5. Supervisor Relieved Notification (Old Supervisor)
export const sendSupervisorRelievedEmail = async (leaveData: any) => {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0; text-align: center;">Official Notice: Leadership Relief</h2>
    <p style="text-align: center; color: #64748b; line-height: 1.6;">
      This email confirms that you have been officially relieved of your duties as Lead Supervisor for <b>${leaveData.teamName}</b>.
    </p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Status Update</p>
      <div style="font-size: 18px; font-weight: bold; color: #000;">Returned to Pool (Available)</div>
      <p style="font-size: 13px; color: #64748b; margin-top: 5px;">You are now eligible for new unit assignments.</p>
    </div>
    
    <p style="text-align: center; font-size: 13px; color: #475569;">
      Thank you for your service and leadership during this deployment. 
      Please ensure all offline data is synced before logging out.
    </p>
  `;

  try {
    const response = await axios.post(API_URL, {
      email: leaveData.email,
      subject: `Official Notice: Unit Leadership Relief | ${leaveData.teamName}`,
      html: emailTemplate(content)
    });
    return response.data;
  } catch (error) {
    console.error("Relief email failed", error);
    return { success: false };
  }
};