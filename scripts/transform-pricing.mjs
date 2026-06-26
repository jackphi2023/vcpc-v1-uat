import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function replaceRequired(source, search, replacement, label) {
  const found = typeof search === 'string' ? source.includes(search) : search.test(source);
  if (!found) throw new Error(`Pricing transform failed: ${label}`);
  return source.replace(search, replacement);
}

export default async function transformPricing(dist) {
  const file = path.join(dist, 'pricing.html');
  let html = await readFile(file, 'utf8');

  const layoutCss = `<style id="pricing-layout-fix">
html{box-sizing:border-box;margin:0;padding:0;width:100%;max-width:100%;overflow-x:hidden}
*,*::before,*::after{box-sizing:inherit}
body{margin:0!important;padding:0!important;width:100%;max-width:100%;min-height:100%;overflow-x:hidden;background:#fbf7ee}
body>header,body>main,body>footer{width:100%;max-width:100%;margin-left:0;margin-right:0}
header.vcpc-header .nav{width:min(1180px,calc(100% - 40px))!important;max-width:1180px!important;margin:0 auto!important;padding:12px 0!important}
header.vcpc-header .brand{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;margin:0!important;padding:0!important;flex:0 1 auto!important}
header.vcpc-header .brand-mark{margin:0!important;flex:0 0 46px!important}
header.vcpc-header .brand-text,header.vcpc-header .brand-name{margin:0!important;padding:0!important;transform:none!important}
header.vcpc-header .nav-links{margin-left:auto!important}
main.vcpc-pricing-page{display:block;width:100%;max-width:100%;margin:0!important;padding:0!important;overflow-x:hidden}
.vcpc-pricing-page .pp-hero,.vcpc-pricing-page .pp-section,.vcpc-pricing-page .pp-process,.vcpc-pricing-page .pp-footnote,.vcpc-pricing-page .pp-contact-bar{width:100%;max-width:100%;margin-left:0;margin-right:0;padding-left:0!important;padding-right:0!important}
.vcpc-pricing-page .pp-hero-inner,.vcpc-pricing-page .pp-tabs,.vcpc-pricing-page .pp-wrap{width:min(1180px,calc(100% - 40px));max-width:1180px;margin-left:auto!important;margin-right:auto!important;padding-left:0!important;padding-right:0!important}
.vcpc-pricing-page .pp-tabs-wrap{width:100%;max-width:100%;margin:0}
.vcpc-pricing-page .pp-grid,.vcpc-pricing-page .pp-info-row,.vcpc-pricing-page .pp-steps{min-width:0;max-width:100%}
.vcpc-pricing-page .pp-card,.vcpc-pricing-page .pp-info-box,.vcpc-pricing-page .pp-step{min-width:0;max-width:100%}
footer.vcpc-footer{width:100%;margin:0;background:#03101e;color:#c8d4e2;padding:38px 0}
footer.vcpc-footer .vcpc-foot{width:min(1180px,calc(100% - 40px));max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
footer.vcpc-footer .foot-brand{display:flex;align-items:center;gap:12px}
footer.vcpc-footer .foot-brand img{width:42px;height:42px;object-fit:contain}
footer.vcpc-footer .foot-brand strong{display:block;color:#ffb20a}
footer.vcpc-footer .foot-brand span{display:block;font-size:13px;margin-top:3px}
footer.vcpc-footer .foot-meta{text-align:right;font-size:13px;line-height:1.7}
footer.vcpc-footer .foot-meta a{color:#ffd36b;text-decoration:none;font-weight:700}
footer.vcpc-footer .foot-links{width:min(1180px,calc(100% - 40px))!important;max-width:1180px!important;margin:24px auto 0!important;padding:16px 0 0!important}
@media(max-width:1000px){header.vcpc-header .nav{padding:10px 0!important}header.vcpc-header .nav-links{margin-left:0!important}}
@media(max-width:640px){header.vcpc-header .nav,.vcpc-pricing-page .pp-hero-inner,.vcpc-pricing-page .pp-tabs,.vcpc-pricing-page .pp-wrap,footer.vcpc-footer .vcpc-foot,footer.vcpc-footer .foot-links{width:calc(100% - 28px)!important}header.vcpc-header .brand{gap:8px!important}header.vcpc-header .brand-mark{flex-basis:42px!important}header.vcpc-header .brand-title{white-space:normal!important;max-width:210px}.vcpc-pricing-page .pp-hero{padding-top:36px!important;padding-bottom:30px!important}.vcpc-pricing-page .pp-section,.vcpc-pricing-page .pp-process{padding-top:36px!important;padding-bottom:36px!important}footer.vcpc-footer .vcpc-foot{align-items:flex-start}footer.vcpc-footer .foot-meta{text-align:left;width:100%}}
</style>`;

  html = replaceRequired(html, '</head>', `${layoutCss}\n</head>`, 'head closing tag not found');

  html = replaceRequired(
    html,
    /<nav class="nav-links" id="navLinks">([\s\S]*?)<\/nav>\s*<\/nav>\s*<\/header>/,
    '<div class="nav-links" id="navLinks">$1</div>\n  </nav>\n</header>',
    'nested navigation block not found'
  );

  html = replaceRequired(
    html,
    /<div><a href="\/cdn-cgi\/l\/email-protection#[^"]+"><span class="__cf_email__"[^>]*>[\s\S]*?<\/span><\/a><\/div>/,
    '<div><a href="mailto:partner@vietcapitalpartners.com">partner@vietcapitalpartners.com</a></div>',
    'protected footer email not found'
  );

  html = html.replace(/<script data-cfasync="false" src="\/cdn-cgi\/scripts\/[^"]+"><\/script>/g, '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/\n[ \t]+\n/g, '\n\n').replace(/\n{3,}/g, '\n\n');

  if (html.includes('/cdn-cgi/l/email-protection') || html.includes('__cf_email__')) {
    throw new Error('Pricing transform failed: Cloudflare email protection remains');
  }
  if (!html.includes('mailto:partner@vietcapitalpartners.com')) {
    throw new Error('Pricing transform failed: plain footer email missing');
  }
  if (html.includes('<!--')) {
    throw new Error('Pricing transform failed: HTML comments remain');
  }
  if (!html.includes('id="pricing-layout-fix"')) {
    throw new Error('Pricing transform failed: layout override missing');
  }

  await writeFile(file, html, 'utf8');
}
