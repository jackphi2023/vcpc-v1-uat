import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FIX_VERSION = 'ui-polish-onboarding-intake-upload-v1';

function replaceSoft(source, search, replacement, label) {
  if (!source.includes(search)) {
    console.warn(`[${FIX_VERSION}] skipped ${label}: anchor not found`);
    return source;
  }
  return source.replace(search, replacement);
}

export default async function transformUIPolish(dist) {
  const onboardingPath = path.join(dist, 'app', 'onboarding.html');
  let onboarding = await readFile(onboardingPath, 'utf8');

  onboarding = replaceSoft(onboarding, '@media(max-width:720px){.vcpc-org-grid,.vcpc-plan-grid,.vcpc-group-grid{grid-template-columns:1fr}.app-main{padding-left:14px!important;padding-right:14px!important}.app-card{padding:18px!important}}', `.vcpc-consent{display:grid!important;grid-template-columns:18px 1fr;gap:0 10px;align-items:start;margin:0!important;color:#41546b;font-size:13.5px;font-weight:500;line-height:1.55;text-align:left;}
    .vcpc-consent input{width:16px;height:16px;margin:2px 0 0!important;flex:none;}
    .vcpc-consent span{display:block;text-align:left;}
    @media(max-width:720px){.vcpc-org-grid,.vcpc-plan-grid,.vcpc-group-grid{grid-template-columns:1fr}.app-main{padding-left:14px!important;padding-right:14px!important}.app-card{padding:18px!important}}`, 'onboarding consent css');
  onboarding = onboarding.replaceAll('<label style="display:flex;gap:10px;align-items:flex-start;"><input type="checkbox"', '<label class="vcpc-consent"><input type="checkbox"');
  onboarding = onboarding.replace(/\s*<button type="button" id="changeGroup"[\s\S]*?<\/button>\s*/, '');
  onboarding = onboarding.replace("document.getElementById('changeGroup').addEventListener('click',function(){groupSel=null;selected=null;renderGroups();renderPlans();});", "var changeGroupBtn=document.getElementById('changeGroup');if(changeGroupBtn)changeGroupBtn.addEventListener('click',function(){groupSel=null;selected=null;renderGroups();renderPlans();});");
  await writeFile(onboardingPath, onboarding, 'utf8');

  const intakePath = path.join(dist, 'app', 'intake.html');
  let intake = await readFile(intakePath, 'utf8');
  intake = replaceSoft(intake, '</head>', `<style>
  #intakeForm .app-grid > div{display:flex;flex-direction:column;}
  #intakeForm label{display:block;margin:0 0 8px!important;color:#071f3d;font-size:13px;font-weight:700;line-height:1.4;}
  #intakeForm input,#intakeForm select{box-sizing:border-box;}
</style></head>`, 'intake label spacing css');
  await writeFile(intakePath, intake, 'utf8');

  const uploadPath = path.join(dist, 'app', 'upload.html');
  let upload = await readFile(uploadPath, 'utf8');
  upload = upload.replaceAll('data-vi="Intake Coverage" data-en="Intake Coverage">Intake Coverage', 'data-vi="Mức độ đầy đủ dữ liệu" data-en="Intake Coverage">Mức độ đầy đủ dữ liệu');
  upload = upload.replaceAll('<b data-vi="Intake Coverage" data-en="Intake Coverage">Intake Coverage</b>', '<b data-vi="Mức độ đầy đủ dữ liệu" data-en="Intake Coverage">Mức độ đầy đủ dữ liệu</b>');
  await writeFile(uploadPath, upload, 'utf8');

  if (!onboarding.includes('class="vcpc-consent"') || onboarding.includes('id="changeGroup"') || !intake.includes('#intakeForm label') || upload.includes('>Intake Coverage</b>')) {
    throw new Error('UI polish transform did not apply completely');
  }
  console.log(`[${FIX_VERSION}] transformed onboarding, intake, and upload UI`);
}
