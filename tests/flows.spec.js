import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const dir='docs/artifacts';
const act=(p,name)=>p.locator(`[data-action="${name}"]`);
async function setup(p,mode='text'){
  await p.goto('/');await p.locator(`[data-mode="${mode}"]`).click();
  await expect(p.locator('.job-card')).toHaveCount(10);
  await act(p,'random-job').click();
  await p.locator('[data-id="slack_off_artist"]').click();
  await act(p,'next-job').click();
  if(mode!=='reverse'){
    await expect(p.locator('.role-card')).toHaveCount(5);
    await p.locator('[data-id="slacking_senior"]').click();
    await act(p,'next-role').click();
  }
  await p.locator('#demo-toggle').check();
}
async function start(p,mode='text') {await setup(p,mode);await act(p,'start').click();await expect(p.locator('#answer-input')).toBeVisible();await expect(p.getByRole('button',{name:'发送',exact:true})).toBeEnabled();await expect(p.locator('.busy-line')).toBeHidden();if(mode==='video'){await act(p,'skip-vision').click();await expect(p.locator('.busy-line')).toBeHidden();}}
async function send(p,text){await p.locator('#answer-input').fill(text);await p.getByRole('button',{name:'发送',exact:true}).click();await expect(p.locator('.busy-line')).toBeHidden();}
async function state(p){const sid=await p.evaluate(()=>sessionStorage.getItem('offer-session'));return await (await p.request.get('/api/sessions/'+sid)).json();}
async function noOverflow(p){expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();}

for(const width of [390,1440])test(`four turns, PNG and restart ${width}px`,async({page:p})=>{
  await p.setViewportSize({width,height:width===390?844:1000});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('/');await noOverflow(p);await p.screenshot({path:`${dir}/home-${width}.png`,fullPage:true});
  await setup(p);await noOverflow(p);await act(p,'start').click();await expect(p.locator('.busy-line')).toBeHidden();
  await p.locator('#answer-input').fill('我先想一个可执行方案');
  await p.getByRole('button',{name:'让我想想',exact:true}).click();await expect(p.locator('.busy-line')).toBeHidden();expect((await state(p)).turns).toBe(0);
  await expect(p.locator('#answer-input')).toHaveValue('我先想一个可执行方案');
  for(const text of ['先用脚本做完重复表格','如果出错，我会抽查并修正','和队友一起确认完成清单','我会先沟通，再安排休息'])await send(p,text);
  await expect(p.locator('.offer-sheet')).toBeVisible();await noOverflow(p);
  const s=await state(p);expect(s.turns).toBe(4);expect(s.phase).toBe('closed');expect(s.result.label).toBe('录用');
  await fs.writeFile(`${dir}/text-flow-${width}.json`,JSON.stringify(s,null,2));
  await p.screenshot({path:`${dir}/offer-${width}.png`,fullPage:true});
  await act(p,'export').click();await expect(p.locator('#image-dialog')).toBeVisible();
  const download=p.waitForEvent('download');await p.locator('#download-image').click();const file=await download;await file.saveAs(`${dir}/offer-export-${width}.png`);
  expect((await fs.stat(`${dir}/offer-export-${width}.png`)).size).toBeGreaterThan(50000);
  await p.getByRole('button',{name:'关闭预览'}).click();await act(p,'again').click();await act(p,'start').click();await expect(p.locator('#answer-input')).toBeVisible();await expect(p.locator('.busy-line')).toBeHidden();
  expect((await state(p)).turns).toBe(0);expect((await state(p)).id).not.toBe(s.id);expect(errors).toEqual([]);
});

test('reverse question and reject',async({page:p})=>{
  await p.setViewportSize({width:390,height:844});await start(p,'reverse');await send(p,'为什么想来做摸鱼艺术家？');
  await p.locator('[data-verdict="reject"]').click();await expect(p.locator('.stamp')).toContainText('暂未录取');
  const s=await state(p);expect(s.phase).toBe('reverse_done');expect(s.history.at(-1).content).toContain('简历');
  await noOverflow(p);await p.screenshot({path:`${dir}/reverse-390.png`,fullPage:true});
});

test('failed POST, retry same request and restore on reload',async({page:p})=>{
  await start(p);await p.route('**/answer',route=>route.abort());await send(p,'我先检查表格');await expect(p.locator('#error-box')).toBeVisible();expect((await state(p)).turns).toBe(0);
  await p.unroute('**/answer');await act(p,'retry').click();await expect(p.locator('.busy-line')).toBeHidden();expect((await state(p)).turns).toBe(1);
  await p.reload();await act(p,'resume').click();await expect(p.locator('#answer-input')).toBeVisible();expect((await state(p)).turns).toBe(1);
});

test('server accepted but response lost: retry does not consume extra turn',async({page:p})=>{
  await start(p);let once=true;
  await p.route('**/answer',async route=>{if(once){once=false;await route.fetch();await route.abort();}else await route.continue();});
  await send(p,'先写脚本，出错就抽查');await expect(p.locator('#error-box')).toBeVisible();expect((await state(p)).turns).toBe(1);
  await act(p,'retry').click();await expect(p.locator('.busy-line')).toBeHidden();expect((await state(p)).turns).toBe(1);
});

test('video fake camera record disabled ASR and cleanup',async({page:p,context,browserName})=>{
  test.skip(browserName!=='chromium','此例只验证 Chromium 假媒体；WebKit/真机媒体需独立实测');
  await context.grantPermissions(['camera','microphone']);
  await p.addInitScript(()=>{window.testTracks=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async c=>{const s=await original(c);window.testTracks.push(...s.getTracks());return s;};});
  await p.setViewportSize({width:390,height:844});await start(p,'video');
  await expect(p.locator('#camera-placeholder')).toBeHidden();await expect(p.locator('#media-status')).toContainText('镜头预览中');
  await act(p,'camera').click();await expect(p.locator('#camera-placeholder')).toBeVisible();await act(p,'camera').click();await expect(p.locator('#camera-placeholder')).toBeHidden();
  await expect(act(p,'mic')).toHaveAttribute('aria-pressed','false');
  await act(p,'mic').click();await expect(act(p,'mic')).toContainText('静音并识别');
  // A short fake microphone sample, no actual user's microphone recording.
  await expect(p.locator('#media-status')).toContainText('正在收声');await act(p,'mic').click();
  await expect(p.locator('#toast')).toContainText(/未启用|有效声音/);await expect(act(p,'mic')).toBeEnabled();
  await act(p,'speak').click();await expect(p.locator('#toast')).toContainText('未启用');
  await noOverflow(p);await p.screenshot({path:`${dir}/video-fake-390.png`,fullPage:true});
  await send(p,'我先确认任务');await act(p,'end').click();await expect(p.locator('.offer-sheet')).toBeVisible();
  expect(await p.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended'))).toBeTruthy();
});

test('camera and microphone denied still allow complete text fallback',async({page:p})=>{
  await setup(p,'video');
  await p.evaluate(()=>{
    window.deniedMediaCalls=0;
    Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:()=>{window.deniedMediaCalls++;return Promise.reject(new DOMException('denied','NotAllowedError'));}},configurable:true});
  });
  await act(p,'start').click();await expect(p.getByRole('button',{name:'发送',exact:true})).toBeEnabled();await expect(p.locator('#camera-placeholder')).toBeVisible();await expect(p.locator('#media-status')).toContainText('待授权');
  expect(await p.evaluate(()=>window.deniedMediaCalls)).toBe(2);
  await act(p,'skip-vision').click();await expect(p.locator('.busy-line')).toBeHidden();await send(p,'先检查，如果不行就调整');await act(p,'end').click();await expect(p.locator('.offer-sheet')).toBeVisible();
});

test('pending camera activation is serialized and a late stream is released on hangup',async({page:p,context,browserName})=>{
  test.skip(browserName!=='chromium','使用 Chromium 假摄像头验证异步授权期间的资源清理');
  await context.grantPermissions(['camera','microphone']);
  await p.addInitScript(()=>{
    window.cameraTestTracks=[];
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=async c=>{const s=await original(c);window.cameraTestTracks.push(...s.getTracks());return s;};
  });
  await start(p,'video');await act(p,'camera').click();
  await p.evaluate(()=>{
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.pendingCameraCalls=0;
    navigator.mediaDevices.getUserMedia=async c=>{window.pendingCameraCalls++;await new Promise(resolve=>window.releaseCamera=resolve);return original(c);};
  });
  await act(p,'camera').click();await expect(act(p,'camera')).toBeDisabled();
  await act(p,'camera').dispatchEvent('click');expect(await p.evaluate(()=>window.pendingCameraCalls)).toBe(1);
  await act(p,'end').click();await expect(p.locator('.offer-sheet')).toBeVisible();
  await p.evaluate(()=>window.releaseCamera());
  await expect.poll(()=>p.evaluate(()=>window.cameraTestTracks.length)).toBe(3);
  expect(await p.evaluate(()=>window.cameraTestTracks.every(t=>t.readyState==='ended'))).toBeTruthy();
});

test('browser contexts isolate sessions',async({browser})=>{
  const a=await browser.newContext(),b=await browser.newContext();const p=await a.newPage();await start(p);const s=await state(p);
  expect((await b.request.get('http://localhost:8000/api/sessions/'+s.id)).status()).toBe(404);await a.close();await b.close();
});

test('hang up while an answer response is pending and ignore stale response',async({page:p})=>{
  await start(p);let release,mark;
  const held=new Promise(resolve=>release=resolve),sent=new Promise(resolve=>mark=resolve);
  await p.route('**/answer',async route=>{const response=await route.fetch();mark();await held;await route.fulfill({response}).catch(()=>{});});
  await p.locator('#answer-input').fill('先检查，如果出错就调整');await p.getByRole('button',{name:'发送',exact:true}).click();await sent;
  await expect(act(p,'end')).toBeEnabled();await act(p,'end').click();await expect(p.locator('.offer-sheet')).toBeVisible();
  release();expect((await state(p)).turns).toBe(1);expect((await state(p)).phase).toBe('closed');
});

test('360 and 550 width selection pages and all portraits load',async({page:p})=>{
  for(const width of [360,550]){
    await p.setViewportSize({width,height:844});await p.goto('/');await noOverflow(p);
    await act(p,'mode').first().click();await noOverflow(p);await act(p,'next-job').click();
    await expect(p.locator('.role-card img')).toHaveCount(5);await expect.poll(()=>p.locator('.role-card img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0))).toBeTruthy();await noOverflow(p);
    await p.screenshot({path:`${dir}/roles-${width}.png`,fullPage:true});
  }
});

async function syntheticMicrophone(p){
  await p.evaluate(()=>{
    window.syntheticBytes=0;window.syntheticMime='';window.syntheticChunks=[];window.syntheticTracks=[];window.syntheticAudios=[];
    window.syntheticRequests=[];window.addEventListener('error',e=>window.syntheticInitError=e.message);
    const NativeRecorder=window.MediaRecorder,NativeAudio=window.Audio;
    window.syntheticAPIs={recorder:typeof NativeRecorder,audio:typeof NativeAudio,context:typeof AudioContext,nativeMediaDevices:typeof navigator.mediaDevices};
    // Wrap native factories instead of subclassing browser-specific constructors.
    Object.defineProperty(window,'MediaRecorder',{value:function(...args){const recorder=new NativeRecorder(...args);window.syntheticMime=recorder.mimeType;recorder.addEventListener('dataavailable',e=>{window.syntheticBytes+=e.data.size;window.syntheticChunks.push(e.data);});return recorder;},configurable:true});
    window.MediaRecorder.isTypeSupported=(...args)=>NativeRecorder.isTypeSupported(...args);
    const nativePlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){if(this.tagName==='AUDIO'&&!window.syntheticAudios.includes(this))window.syntheticAudios.push(this);return nativePlay.apply(this,args);};
    const ctx=new AudioContext(),osc=ctx.createOscillator(),dest=ctx.createMediaStreamDestination();window.syntheticContext=ctx;
    osc.frequency.value=440;osc.connect(dest);osc.start();
    document.addEventListener('click',()=>ctx.resume(),{once:true,capture:true});
    Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async constraints=>{
      window.syntheticRequests.push(constraints.video?'video':'audio');
      if(constraints.video)throw new DOMException('Synthetic audio test, no real camera','NotAllowedError');
      try{
        window.syntheticTracks.push(...dest.stream.getTracks());return dest.stream;
      }catch(e){window.syntheticError=e.name+': '+e.message;throw e;}
    }},configurable:true});
  });
}

function toneWav(){
  // Test fixture only: a quiet 4s sine tone, not generated speech or a user's recording.
  const rate=16000,samples=rate*4,b=Buffer.alloc(44+samples*2);
  b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples*2,40);
  for(let i=0;i<samples;i++)b.writeInt16LE(Math.round(500*Math.sin(i*2*Math.PI*440/rate)),44+i*2);
  return b;
}

test('mock ASR editing, actual browser recording codec conversion, and playback interlock',async({page:p,browserName})=>{
  await p.route('**/asr',async route=>{
    expect(route.request().headers()['content-type']).toContain('multipart/form-data');
    await route.fulfill({json:{text:'我会先偷懒'}});
  });
  await p.route('**/tts',route=>route.fulfill({contentType:'audio/wav',body:toneWav()}));
  await p.setViewportSize({width:390,height:844});await setup(p,'video');await syntheticMicrophone(p);await act(p,'start').click();await expect(p.locator('.busy-line')).toBeHidden();await act(p,'skip-vision').click();await expect(p.locator('.busy-line')).toBeHidden();
  await expect(act(p,'mic'),await p.evaluate(()=>JSON.stringify({error:window.syntheticError,init:window.syntheticInitError,requests:window.syntheticRequests,apis:window.syntheticAPIs}))).toBeEnabled();
  await act(p,'mic').click();await expect.poll(()=>p.evaluate(()=>window.syntheticBytes)).toBeGreaterThan(150);await act(p,'mic').click();
  await expect(p.locator('#answer-input')).toHaveValue('我会先偷懒');
  const corrected='我会先写脚本，如果出错就抽查修正';await send(p,corrected);
  expect((await state(p)).history.filter(h=>h.role==='user').at(-1).content).toBe(corrected);
  // WebKit's intercepted request metadata omits binary multipart bodies. Use the
  // same actual MediaRecorder chunks that the application wrapped and uploaded.
  const recorded=Buffer.from(await p.evaluate(async()=>Array.from(new Uint8Array(await new Blob(window.syntheticChunks).arrayBuffer()))));
  const normalized=spawnSync('.venv/bin/python',['-c',`import asyncio,io,json,sys,wave
from app import providers
evidence={}
async def mock(name,url,**kw):
    raw=kw['files']['file'][1]
    with wave.open(io.BytesIO(raw),'rb') as w: evidence.update(rate=w.getframerate(),channels=w.getnchannels(),container=raw[:4].decode())
    return {'text':'synthetic fixture, not live ASR'}
providers.post=mock
asyncio.run(providers.transcribe(sys.stdin.buffer.read()))
print(json.dumps(evidence))`],{input:recorded,encoding:'utf8'});
  expect(normalized.status,normalized.stderr+'\n'+JSON.stringify({bytes:recorded.length,prefix:recorded.subarray(0,40).toString('hex'),mime:await p.evaluate(()=>window.syntheticMime),audio:await p.evaluate(()=>({state:window.syntheticContext.state,time:window.syntheticContext.currentTime}))})).toBe(0);
  const evidence=JSON.parse(normalized.stdout);expect(evidence).toEqual({rate:16000,channels:1,container:'RIFF'});
  await fs.writeFile(`${dir}/browser-audio-${browserName}.json`,JSON.stringify({source:'Web Audio synthetic tone; ASR/TTS mocked',browser:browserName,mime:await p.evaluate(()=>window.syntheticMime),normalized:evidence},null,2));
  await act(p,'speak').click();await expect(p.locator('#character-state')).toContainText('说话中');
  expect(await p.evaluate(()=>window.syntheticAudios.length)).toBe(1);
  await expect(act(p,'mic')).toHaveAttribute('aria-pressed','false');expect(await p.evaluate(()=>window.syntheticTracks.every(t=>!t.enabled))).toBeTruthy();
  await p.getByRole('button',{name:'让我想想',exact:true}).click();await expect(p.locator('.busy-line')).toBeHidden();await expect(p.locator('#character-stage')).not.toHaveClass(/speaking/);
  expect(await p.evaluate(()=>window.syntheticAudios.every(a=>a.paused))).toBeTruthy();
  await act(p,'end').click();await expect(p.locator('.offer-sheet')).toBeVisible();
  expect(await p.evaluate(()=>window.syntheticTracks.every(t=>t.readyState==='ended'))).toBeTruthy();
});

test('hang up cancels delayed mock TTS without starting stale playback',async({page:p})=>{
  let release,mark;
  const held=new Promise(resolve=>release=resolve),requested=new Promise(resolve=>mark=resolve);
  await p.route('**/tts',async route=>{mark();await held;await route.fulfill({contentType:'audio/wav',body:toneWav()}).catch(()=>{});});
  await setup(p,'video');await syntheticMicrophone(p);await act(p,'start').click();await expect(p.locator('.busy-line')).toBeHidden();await act(p,'skip-vision').click();await expect(p.locator('.busy-line')).toBeHidden();await act(p,'speak').click();await requested;
  await act(p,'end').click();await expect(p.locator('.offer-sheet')).toBeVisible();release();
  expect(await p.evaluate(()=>window.syntheticAudios.every(a=>a.paused))).toBeTruthy();
  expect((await state(p)).phase).toBe('closed');
});

test('text interview has playback but never requests a microphone',async({page:p})=>{
  await p.route('**/tts',route=>route.fulfill({contentType:'audio/wav',body:toneWav()}));
  await setup(p);await syntheticMicrophone(p);await act(p,'start').click();await expect(p.locator('.busy-line')).toBeHidden();
  await expect(act(p,'mic')).toHaveCount(0);expect(await p.evaluate(()=>window.syntheticRequests.length)).toBe(0);
  await send(p,'我先用脚本处理表格，再抽查三行');expect((await state(p)).turns).toBe(1);
  await act(p,'speak').click();await expect(act(p,'speak')).toContainText('停止播放');
  await act(p,'speak').click();await expect(act(p,'speak')).toContainText('播放本轮');
  expect(await p.evaluate(()=>window.syntheticRequests.length)).toBe(0);
  await act(p,'end').click();await expect(p.locator('.offer-sheet')).toBeVisible();
  await expect(act(p,'speak')).toHaveCount(0);
});

test('video framing waits for ready and explicit screenshot consent',async({page:p,context,browserName})=>{
  test.skip(browserName!=='chromium','使用明确的假摄像头；不是手机或真人截图');
  await context.grantPermissions(['camera','microphone']);let uploads=0;
  await p.route('**/vision',route=>{uploads++;return route.fulfill({json:{ok:true,facts:{clothing:['蓝色上衣'],objects:[],background:[]}}});});
  await p.setViewportSize({width:390,height:844});await setup(p,'video');await act(p,'start').click();await expect(p.locator('.busy-line')).toBeHidden();
  await expect(act(p,'stand-ready')).toBeVisible();await expect(p.locator('.busy-line')).toBeHidden();expect((await state(p)).phase).toBe('framing');expect(uploads).toBe(0);
  await expect(p.locator('#subtitles')).toContainText('站好了');await send(p,'我已经站好了');await expect(p.locator('.busy-line')).toBeHidden();
  expect((await state(p)).turns).toBe(0);expect(uploads).toBe(0);
  await p.screenshot({path:`${dir}/v2-video-consent-390.png`,fullPage:true});
  await act(p,'analyze').click();await expect(p.locator('.busy-line')).toBeHidden();await expect(p.locator('.vision-summary')).toContainText('蓝色上衣');expect(uploads).toBe(1);expect((await state(p)).phase).toBe('active');expect((await state(p)).turns).toBe(0);
});

test('keyboard viewport has no reserved blank below input',async({page:p})=>{
  await p.setViewportSize({width:390,height:844});await start(p);
  await p.locator('#answer-input').focus();
  await p.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,get:()=>380});window.visualViewport.dispatchEvent(new Event('resize'));});
  await expect(p.locator('body')).toHaveClass(/keyboard-open/);
  const bounds=await p.locator('#answer-form').boundingBox();expect(bounds.y+bounds.height).toBeLessThanOrEqual(381);expect(bounds.y+bounds.height).toBeGreaterThanOrEqual(375);
  await p.screenshot({path:`${dir}/v2-keyboard-${test.info().project.name}.png`,fullPage:true});
});

test('branded login form and generic login errors',async({page:p})=>{
  await p.setViewportSize({width:390,height:844});await p.goto('/login');await expect(p.locator('h1')).toContainText('今天轮到你了');
  await p.route('**/api/login',route=>route.fulfill({status:401,json:{detail:'账号或密码不正确'}}));
  await p.getByLabel('账号',{exact:true}).fill('fixture-user');await p.getByLabel('密码',{exact:true}).fill('wrong-fixture-password');await p.getByRole('button',{name:'进入人事部'}).click();
  await expect(p.locator('#login-error')).toHaveText('账号或密码不正确');await noOverflow(p);
  await p.screenshot({path:`${dir}/v2-login-${test.info().project.name}.png`,fullPage:true});
});

test('in-call opt-in analyzes automatically after saying ready',async({page:p,context,browserName})=>{
  test.skip(browserName!=='chromium','仅使用 Chromium 假摄像头验证授权时序');
  await context.grantPermissions(['camera','microphone']);let uploads=0;
  await p.route('**/vision',route=>{uploads++;return route.fulfill({json:{ok:true,facts:{clothing:['测试衣服'],objects:[],background:[]}}});});
  await setup(p,'video');await act(p,'start').click();await expect(act(p,'stand-ready')).toBeVisible();await expect(p.locator('.busy-line')).toBeHidden();
  await p.locator('#vision-consent').check();expect(uploads).toBe(0);
  await send(p,'我已经站好了');await expect.poll(async()=>(await state(p)).phase).toBe('active');expect(uploads).toBe(1);expect((await state(p)).turns).toBe(0);
});

test('starting an interview never exposes premature result controls',async({page:p})=>{
  await setup(p);let release,mark;const held=new Promise(resolve=>release=resolve),started=new Promise(resolve=>mark=resolve);
  await p.route('**/start',async route=>{mark();await held;await route.continue();});
  await act(p,'start').click();await started;await expect(act(p,'show-result')).toHaveCount(0);await expect(act(p,'again')).toHaveCount(0);release();
  await expect(p.locator('#answer-input')).toBeVisible();
});

test('video input follows visible keyboard viewport without bottom spacer',async({page:p})=>{
  await p.setViewportSize({width:390,height:844});await setup(p,'video');
  await p.evaluate(()=>Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>Promise.reject(new DOMException('fixture permission denied','NotAllowedError'))}}));
  await act(p,'start').click();await expect(act(p,'skip-vision')).toBeVisible();await expect(p.locator('.busy-line')).toBeHidden();await act(p,'skip-vision').click();await expect(p.locator('.busy-line')).toBeHidden();
  await p.locator('#answer-input').focus();await p.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,get:()=>380});window.visualViewport.dispatchEvent(new Event('resize'));});
  const bounds=await p.locator('#answer-form').boundingBox();expect(bounds.y+bounds.height).toBeLessThanOrEqual(381);expect(bounds.y+bounds.height).toBeGreaterThanOrEqual(375);await noOverflow(p);
});

for(const mode of ['text','video'])test(`${mode} keyboard follows iOS panning offset and restores`,async({page:p})=>{
  await p.setViewportSize({width:390,height:844});await start(p,mode);
  await p.locator('#answer-input').focus();
  await p.evaluate(()=>{
    Object.defineProperty(window.visualViewport,'height',{configurable:true,get:()=>360});
    Object.defineProperty(window.visualViewport,'offsetTop',{configurable:true,get:()=>180});
    window.visualViewport.dispatchEvent(new Event('scroll'));
  });
  const room=await p.locator(mode==='video'?'.video-room':'.room').boundingBox();
  const input=await p.locator('#answer-form').boundingBox();
  expect(room.y).toBeCloseTo(180,0);expect(input.y+input.height).toBeCloseTo(540,0);
  const message=await p.locator(mode==='video'?'#subtitles':'#messages').boundingBox();expect(message.height).toBeGreaterThan(80);
  await p.screenshot({path:`${dir}/v3-keyboard-offset-${mode}-${test.info().project.name}.png`});
  await p.evaluate(()=>{
    document.activeElement.blur();
    Object.defineProperty(window.visualViewport,'height',{configurable:true,get:()=>844});
    Object.defineProperty(window.visualViewport,'offsetTop',{configurable:true,get:()=>0});
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await expect(p.locator('body')).not.toHaveClass(/keyboard-open/);
  const restored=await p.locator('#answer-form').boundingBox();expect(restored.y+restored.height).toBeCloseTo(844,0);
});

for(const mode of ['text','video'])test(`${mode} closing speech finishes before offer and navigation cancels it`,async({page:p})=>{
  // Backend is demo; only the closed snapshot is marked live to exercise auto TTS with a synthetic WAV.
  await p.route('**/api/catalog',async route=>{const data=await (await route.fetch()).json();data.capabilities.tts=true;await route.fulfill({json:data});});
  await p.route('**/tts',route=>route.fulfill({contentType:'audio/wav',body:toneWav()}));
  await p.route('**/end',async route=>{const data=await (await route.fetch()).json();data.demo=false;await route.fulfill({json:data});});
  await p.setViewportSize({width:390,height:844});await start(p,mode);await syntheticMicrophone(p);
  await act(p,'end').click();
  await expect(act(p,'show-result')).toBeVisible();await expect(p.locator('.offer-sheet')).toHaveCount(0);
  await expect.poll(()=>p.evaluate(()=>window.syntheticAudios.some(a=>!a.paused&&a.currentTime>0))).toBeTruthy();
  await expect(p.locator('.offer-sheet')).toBeVisible({timeout:10000});
  expect(await p.evaluate(()=>window.syntheticAudios.every(a=>a.paused))).toBeTruthy();
  await expect(act(p,'speak')).toHaveCount(0);
  await act(p,'again').click();await act(p,'start').click();await expect(p.locator('.busy-line')).toBeHidden();
  if(mode==='video'){await act(p,'skip-vision').click();await expect(p.locator('.busy-line')).toBeHidden();}
  await act(p,'end').click();await expect(act(p,'show-result')).toBeVisible();
  await expect.poll(()=>p.evaluate(()=>window.syntheticAudios.some(a=>!a.paused&&a.currentTime>0))).toBeTruthy();
  await act(p,'show-result').click();await expect(p.locator('.offer-sheet')).toBeVisible();
  expect(await p.evaluate(()=>window.syntheticAudios.every(a=>a.paused))).toBeTruthy();
});

test('explicit ready-photo button uploads once and shows honest empty clothing result',async({page:p,context,browserName})=>{
  test.skip(browserName!=='chromium','Chromium fake camera; no personal photo');
  await context.grantPermissions(['camera','microphone']);let uploads=0;
  await p.route('**/vision',route=>{uploads++;return route.fulfill({json:{ok:true,facts:{clothing:[],objects:[],background:['测试背景']}}});});
  await setup(p,'video');await act(p,'start').click();await expect(p.locator('.busy-line')).toBeHidden();
  await expect(act(p,'stand-ready')).toContainText('拍一张看穿搭');expect(uploads).toBe(0);
  await act(p,'stand-ready').click();await expect(p.locator('.busy-line')).toBeHidden();expect(uploads).toBe(1);
  await expect(p.locator('.vision-summary')).toContainText('没有看清衣着');await expect(p.locator('.vision-summary')).toContainText('测试背景');
  expect((await state(p)).turns).toBe(0);expect((await state(p)).phase).toBe('active');
  await p.screenshot({path:`${dir}/v3-vision-result.png`});
});

test('unavailable framing camera reports no analysis and allows a plain opening',async({page:p})=>{
  let uploads=0;await p.route('**/vision',route=>{uploads++;return route.abort();});
  await setup(p,'video');
  await p.evaluate(()=>Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>Promise.reject(new DOMException('Fixture denied','NotAllowedError'))}}));
  await act(p,'start').click();await expect(p.locator('.busy-line')).toBeHidden();await act(p,'stand-ready').click();await expect(p.locator('.busy-line')).toBeHidden();
  await expect(p.locator('.vision-summary')).toContainText('穿搭分析未完成');expect(uploads).toBe(0);
  expect((await state(p)).phase).toBe('framing');expect((await state(p)).turns).toBe(0);
  await act(p,'skip-vision').click();await expect(p.locator('.busy-line')).toBeHidden();
  await expect(p.locator('.vision-summary')).toContainText('未上传截图');expect((await state(p)).phase).toBe('active');
});
