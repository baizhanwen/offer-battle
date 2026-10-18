const $=q=>document.querySelector(q);
const sharedAudio=new Audio();
sharedAudio.preload='auto';
let unlocked=false;

export class MediaRoom {
  static unlockAudio(){
    if(unlocked)return;
    // Reuse the same element after this user-gesture playback on mobile Safari.
    const bytes=new Uint8Array(204),v=new DataView(bytes.buffer);
    const word=(offset,s)=>[...s].forEach((c,i)=>bytes[offset+i]=c.charCodeAt(0));
    word(0,'RIFF');v.setUint32(4,196,true);word(8,'WAVE');word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);word(36,'data');v.setUint32(40,160,true);bytes.fill(128,44);
    sharedAudio.src=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));const silent=sharedAudio.src;
    sharedAudio.play().then(()=>{unlocked=true;if(sharedAudio.src===silent)sharedAudio.pause();URL.revokeObjectURL(silent);}).catch(()=>URL.revokeObjectURL(silent));
  }
  constructor(session,icon,toast,isBusy){
    this.session=session;this.icon=icon;this.toast=toast;this.isBusy=isBusy;this.videoStream=null;this.audioStream=null;this.muted=true;this.cameraOn=false;this.cameraPending=false;this.cameraGeneration=0;this.recording=false;this.disposed=false;this.playing=false;this.work=false;this.epoch=0;this.recorder=null;this.startTime=Date.now();this.autoVoice=true;this.audio=sharedAudio;
    this.timer=setInterval(()=>{const el=$('#call-timer');if(el){const sec=Math.floor((Date.now()-this.startTime)/1000);el.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}},1000);
  }
  async connect(){
    if(!navigator.mediaDevices?.getUserMedia){this.toast('当前地址不支持媒体权限；手机请使用 HTTPS。本局可打字。');this.updateStatus();return;}
    this.cameraPending=true;const generation=this.cameraGeneration;this.updateStatus();
    try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});if(this.disposed||generation!==this.cameraGeneration){stream.getTracks().forEach(t=>t.stop());return;}this.videoStream=stream;this.cameraOn=true;}
    catch{if(!this.disposed)this.toast('摄像头未授权或无设备，仍可语音或打字。');}
    finally{this.cameraPending=false;this.attach();this.updateStatus();}
    if(!this.disposed)await this.ensureMicrophone().catch(()=>this.toast('麦克风未授权或无设备，请打字回答。'));
  }
  async ensureMicrophone(){
    if(this.audioStream?.getAudioTracks().some(t=>t.readyState==='live'))return;
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('录音不可用，请打字回答');
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
    if(this.disposed){stream.getTracks().forEach(t=>t.stop());return;}
    this.audioStream=stream;stream.getTracks().forEach(t=>t.enabled=false);this.updateStatus();
  }
  attach(){const video=$('#self-video');if(video){if(video.srcObject!==this.videoStream)video.srcObject=this.videoStream;video.play().catch(()=>{});}if($('#camera-placeholder'))$('#camera-placeholder').hidden=this.hasCamera();}
  hasCamera(){return this.cameraOn&&this.videoStream?.getVideoTracks().some(t=>t.readyState==='live');}
  updateStatus(note=''){
    if(this.disposed)return;
    if($('#vision-consent'))$('#vision-consent').checked=!!this.visionConsent;
    if($('#media-status'))$('#media-status').textContent=note||`${this.session.mode==='video'?(this.hasCamera()?'镜头预览中 · 未录像':'镜头关闭')+' / ':''}${this.recording?'正在收声 · 再次静音结束并识别（最多45秒）':this.audioStream?'已静音 · 解除静音开始说话':'麦克风待授权 · 也可打字'}`;
    const mic=$('#mic-button');if(mic){mic.innerHTML=this.icon('mic')+(this.recording?'静音并识别':'解除静音');mic.classList.toggle('recording',this.recording);mic.setAttribute('aria-pressed',String(!this.muted));mic.disabled=this.disposed||this.work||this.isBusy()||this.session.phase==='closed';}
    const camera=$('#camera-button');if(camera){camera.innerHTML=this.icon('camera')+(this.cameraPending?'连接镜头中':this.hasCamera()?'关闭镜头':'开启镜头');camera.disabled=this.cameraPending||this.session.phase==='closed';}
    const speak=$('#speak-button');if(speak){speak.innerHTML=this.icon('sound')+(this.playing?'停止播放':'播放本轮');speak.disabled=this.recording||this.work||this.isBusy();}
  }
  setThinking(value){$('#character-stage')?.classList.toggle('thinking',value);if(!this.playing&&$('#character-state'))$('#character-state').textContent=value?'思考中 · 正在翻答卷':'待机 · 等你回答';this.updateStatus();}
  updateSession(session){this.session=session;this.epoch++;this.attach();this.updateStatus();}
  cancelPlayback(completed=false){this.completePlayback?.(completed);this.completePlayback=null;this.epoch++;this.ttsAbort?.abort();this.audio.pause();this.audio.onended=null;this.audio.onerror=null;if(this.audioUrl){URL.revokeObjectURL(this.audioUrl);this.audioUrl=null;}this.playing=false;$('#character-stage')?.classList.remove('speaking');if($('#character-state'))$('#character-state').textContent='待机 · 等你回答';this.updateStatus();}
  waitForPlayback(){return this.playbackDone||Promise.resolve(false);}
  async play(){
    if(this.disposed||this.recording||this.work)return;
    if(this.playing){this.cancelPlayback();return;}
    this.cancelPlayback();const epoch=this.epoch,key=this.session.id+'|'+this.session.history.filter(h=>h.role==='assistant').at(-1)?.content;
    const start=async blob=>{
      if(this.disposed||epoch!==this.epoch)return;
      this.audioUrl=URL.createObjectURL(blob);this.audio.src=this.audioUrl;
      this.playbackDone=new Promise(resolve=>this.completePlayback=resolve);
      this.audio.onended=()=>this.cancelPlayback(true);this.audio.onerror=()=>{this.cancelPlayback();this.toast('语音无法播放，请阅读字幕。');};
      await this.audio.play();if(this.disposed||epoch!==this.epoch){this.audio.pause();return;}this.playing=true;$('#character-stage')?.classList.add('speaking');if($('#character-state'))$('#character-state').textContent='说话中 · 字幕与声音相同';
    };
    if(this.cacheKey===key&&this.cachedBlob){try{await start(this.cachedBlob);}catch{this.toast('请再点一次「播放本轮」，字幕会一直保留。');}this.updateStatus();return;}
    this.ttsAbort=new AbortController();this.work=true;this.updateStatus('正在准备本轮语音…');const timer=setTimeout(()=>this.ttsAbort?.abort(),30000);
    try{
      const response=await fetch(`/api/sessions/${this.session.id}/tts`,{method:'POST',signal:this.ttsAbort.signal});
      if(!response.ok){const error=await response.json();throw new Error(error.detail||'语音暂不可用');}
      const blob=await response.blob();if(this.disposed||epoch!==this.epoch)return;
      this.cachedBlob=blob;this.cacheKey=key;await start(blob);
    }catch(error){if(!this.disposed&&epoch===this.epoch)this.toast((error.name==='NotAllowedError'?'语音已准备好，点击「播放本轮」即可播放':error.name==='AbortError'?'语音准备超时':error.message)+'；保留字幕。');}
    finally{clearTimeout(timer);this.work=false;this.updateStatus();}
  }
  async toggleMic(){
    if(this.recording){this.muted=true;if(this.recorder?.state==='recording')this.recorder.stop();this.updateStatus();return;}
    if(this.work||this.isBusy())return;
    this.cancelPlayback();await this.ensureMicrophone();if(this.disposed)return;
    this.muted=false;await this.toggleRecording();
  }
  async toggleCamera(){
    if(this.disposed||this.cameraPending)return;
    if(this.hasCamera()){this.videoStream.getTracks().forEach(t=>t.stop());this.videoStream=null;this.cameraOn=false;this.attach();this.updateStatus();return;}
    if(!navigator.mediaDevices?.getUserMedia)return;
    this.cameraPending=true;const generation=this.cameraGeneration;this.updateStatus();
    try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});if(this.disposed||generation!==this.cameraGeneration){stream.getTracks().forEach(t=>t.stop());return;}this.videoStream=stream;this.cameraOn=true;this.attach();}
    finally{this.cameraPending=false;this.updateStatus();}
  }
  async capture(){if(!this.hasCamera())throw new Error('没有可用摄像头，可跳过穿搭继续');const video=$('#self-video');if(!video.videoWidth||video.readyState<2)await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);video.removeEventListener('loadeddata',done);resolve();};const timer=setTimeout(()=>{video.removeEventListener('loadeddata',done);reject(new Error('镜头尚未就绪，请稍后再试'));},4000);video.addEventListener('loadeddata',done);});if(this.disposed||!this.hasCamera())throw new Error('镜头已关闭，可跳过穿搭继续');const canvas=document.createElement('canvas');canvas.width=640;canvas.height=Math.round(640*video.videoHeight/video.videoWidth);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);return new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.65));}
  async toggleRecording(){
    if(this.disposed)return;
    if(this.recording){if(this.recorder.state==='recording')this.recorder.stop();return;}
    if(this.work||this.playing||this.isBusy())return;
    if(!window.MediaRecorder||!this.audioStream){this.muted=true;this.toast('录音不可用，请打字回答');return;}
    this.cancelPlayback();const epoch=this.epoch;this.discardRecording=false;
    const type=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));let chunks=[],bytes=0;
    try{this.recorder=new MediaRecorder(this.audioStream,type?{mimeType:type}:{});}catch{this.muted=true;this.toast('当前浏览器无法录音，请打字');return;}
    const recorder=this.recorder;
    recorder.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);bytes+=event.data.size;if(bytes>6_000_000&&recorder.state==='recording'){this.discardRecording=true;recorder.stop();this.toast('录音超过6MB，请缩短回答');}}};
    recorder.onerror=()=>{this.discardRecording=true;this.toast('录音失败，请打字');this.stopRecordResources();};
    recorder.onstop=async()=>{
      this.stopRecordResources();const blob=new Blob(chunks,{type:recorder.mimeType});chunks=[];
      if(this.disposed||this.discardRecording||epoch!==this.epoch)return;
      if(blob.size<150){this.toast('没有录到有效声音，请重试或打字');return;}
      this.work=true;this.asrAbort=new AbortController();const timer=setTimeout(()=>this.asrAbort?.abort(),40000);this.updateStatus('已静音，正在识别；请校正文字后发送');
      try{const form=new FormData();form.append('file',blob,'answer.'+(recorder.mimeType.includes('mp4')?'mp4':'webm'));const response=await fetch(`/api/sessions/${this.session.id}/asr`,{method:'POST',body:form,signal:this.asrAbort.signal});const data=await response.json();if(!response.ok)throw new Error(data.detail||'识别失败');if(this.disposed||epoch!==this.epoch)return;const input=$('#answer-input');if(input){input.value=data.text;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}this.toast('识别完成，请校正后发送');}
      catch(error){if(!this.disposed&&epoch===this.epoch)this.toast((error.name==='AbortError'?'识别超时':error.message)+'；请打字回答。');}
      finally{clearTimeout(timer);this.work=false;this.updateStatus();}
    };
    this.audioStream.getTracks().forEach(t=>t.enabled=true);
    try{recorder.start(500);this.recording=true;this.muted=false;this.recordTimer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},45000);this.updateStatus();}catch{this.stopRecordResources();this.toast('录音启动失败，请打字');}
  }
  stopRecordResources(){clearTimeout(this.recordTimer);this.recording=false;this.muted=true;this.audioStream?.getTracks().forEach(t=>t.enabled=false);this.updateStatus();}
  pauseForBackground(){this.cameraGeneration++;this.cancelPlayback();this.asrAbort?.abort();if(this.recording){this.discardRecording=true;this.recorder?.stop();this.toast('切到后台，当前录音已取消');}[this.videoStream,this.audioStream].forEach(s=>s?.getTracks().forEach(t=>t.stop()));this.videoStream=null;this.audioStream=null;this.cameraOn=false;this.muted=true;this.attach();this.updateStatus();}
  dispose(){if(this.disposed)return;this.disposed=true;this.cameraGeneration++;this.epoch++;this.ttsAbort?.abort();this.asrAbort?.abort();clearInterval(this.timer);clearTimeout(this.recordTimer);this.discardRecording=true;if(this.recorder?.state==='recording')this.recorder.stop();this.cancelPlayback();[this.videoStream,this.audioStream].forEach(s=>s?.getTracks().forEach(t=>t.stop()));this.videoStream=null;this.audioStream=null;const video=$('#self-video');if(video)video.srcObject=null;}
}
