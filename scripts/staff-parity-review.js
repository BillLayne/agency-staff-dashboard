async page => {
 const t=await page.context().newPage();
 await t.addInitScript(() => sessionStorage.setItem('staff-dashboard:notes-draft:v1', JSON.stringify({customerName:'Synthetic test',customerNotes:'Draft to preserve'})));
 await t.goto('http://127.0.0.1:8791/');
 const check=(v,m)=>{if(!v)throw Error(m)};
 for(const width of [320,390,1440]) {await t.setViewportSize({width,height:900}); check(await t.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+width);}
 const quick=t.locator('.finder-panel').filter({has:t.getByRole('heading',{name:'Quick tools'})});
 const btn=await quick.locator('button').allTextContents(); check(btn.findIndex(x=>x.includes('Home Quote Info'))===btn.findIndex(x=>x.includes('Auto Quote Info'))+1,'quote shortcuts');
 await quick.getByRole('button',{name:'Resume Memo'}).click();
 const memo=t.getByRole('dialog',{name:'Audit Memo Draft'}); check(await memo.getByLabel('Customer name').inputValue()==='Synthetic test','old memo name'); check((await memo.locator('textarea').first().inputValue())==='Draft to preserve','old memo text');
 await memo.getByRole('button',{name:'Close Audit Memo Draft'}).click();
 await quick.getByRole('button',{name:'Auto Quote Info',exact:true}).click();
 const auto=t.getByRole('dialog',{name:'Auto Quote Information'}); check(await auto.getByRole('group',{name:'Quote workspace view'}).isVisible(),'auto quote'); await auto.getByRole('button',{name:'Close Auto Quote Information'}).click();
 await quick.getByRole('button',{name:'Home Quote Info',exact:true}).click();
 const home=t.getByRole('dialog',{name:'Home Quote Information'}); await home.getByLabel('Property address').fill('800 Creekwood Rd, Sanford, NC 27330');
 const response=t.waitForResponse(r=>r.url().endsWith('/api/home-quote')&&r.request().method()==='POST',{timeout:35000}); await home.getByRole('button',{name:'Start home quote'}).click(); check((await response).ok(),'home research');
 await home.getByText('9612-95-5442-00',{exact:true}).first().waitFor({timeout:15000});
 const facts=await home.getByRole('region',{name:'Property research'}).innerText(); check(facts.includes('2002') && facts.includes('3644'),'research values');
 await home.getByRole('button',{name:'Close Home Quote Information'}).click();
 await t.getByRole('navigation',{name:'Workspace',exact:true}).getByRole('button',{name:'Tools'}).click();
 check(await t.getByRole('heading',{name:'Tools',exact:false}).count() || await t.getByText('Late Pay',{exact:true}).count(),'tools workspace');
 check(await t.getByText('Late Pay',{exact:true}).count()>0,'staff tool lost');
 check(await t.getByText('BLI Mail Gateway',{exact:true}).count()===0,'restricted mail gateway exposed');
 await t.close();
 console.log('PASS: responsive design, legacy staff memo recovery, auto/home quote, real property facts, staff launcher and mail restriction');
}
