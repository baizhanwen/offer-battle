let lastUrl=null;

function wrap(ctx,text,x,y,width,lineHeight){let line='';for(const c of Array.from(text)){if(c==='\n'||ctx.measureText(line+c).width>width){ctx.fillText(line,x,y);y+=lineHeight;line=c==='\n'?'':c;}else line+=c;}if(line){ctx.fillText(line,x,y);y+=lineHeight;}return y;}
function line(ctx,x,y,w,color='#d0c2a5'){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();}

export async function exportOffer(session,job,role){
  await document.fonts.ready;
  const portrait=new Image();portrait.src=role.avatar;await portrait.decode();
  const c=document.createElement('canvas');c.width=1080;c.height=1570;const ctx=c.getContext('2d');
  const r=session.result,red='#B02A1F',ink='#2B2B2B';
  ctx.fillStyle='#F7EFDE';ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='#FDF8EE';ctx.fillRect(45,45,990,1475);ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.strokeRect(45,45,990,1475);
  ctx.textAlign='center';ctx.fillStyle=red;ctx.font='24px sans-serif';ctx.fillText('OFFER 大作战 · 校园人事部',540,115);
  ctx.font='bold 65px "Songti SC", STSong, SimSun, serif';ctx.fillText('校园岗位录用单',540,210);
  line(ctx,105,245,870,red);line(ctx,105,254,870,red);ctx.font='23px monospace';ctx.fillStyle='#85765c';ctx.fillText(r.number,540,299);
  const ratio=Math.min(170/portrait.width,210/portrait.height);ctx.drawImage(portrait,105,330,portrait.width*ratio,portrait.height*ratio);
  ctx.textAlign='left';ctx.fillStyle=ink;ctx.font='bold 43px "Songti SC",serif';let y=wrap(ctx,job.position_name,315,390,650,53);
  ctx.fillStyle='#85765c';ctx.font='25px sans-serif';ctx.fillText('面试官：'+role.role_name,315,y+15);ctx.fillText(`已答 ${session.turns} 题 · 校园娱乐批示`,315,y+60);
  line(ctx,105,560,870);
  let sy=630;
  Object.entries(r.scores).forEach(([name,value])=>{ctx.fillStyle=ink;ctx.font='27px sans-serif';ctx.fillText(name,105,sy);ctx.fillStyle='#e9dec6';ctx.fillRect(300,sy-20,545,18);ctx.fillStyle=red;ctx.fillRect(300,sy-20,545*value/10,18);ctx.font='bold 27px sans-serif';ctx.fillText(`${value}/10`,880,sy);sy+=62;});
  line(ctx,105,940,870);ctx.fillStyle=ink;ctx.font='36px "Kaiti SC", STKaiti, KaiTi, serif';wrap(ctx,r.comment,115,1000,830,54);line(ctx,105,1135,870);
  ctx.fillStyle=red;ctx.font='65px "Songti SC",serif';ctx.fillText(r.average.toFixed(1),115,1245);ctx.fillStyle='#85765c';ctx.font='23px sans-serif';ctx.fillText('五维平均分 / 10',115,1290);
  ctx.save();ctx.translate(835,1240);ctx.rotate(-.22);ctx.strokeStyle=r.status==='hired'?'#2F9E57':red;ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=5;[108,99].forEach(rad=>{ctx.beginPath();ctx.arc(0,0,rad,0,Math.PI*2);ctx.stroke();});ctx.textAlign='center';ctx.font='21px serif';ctx.fillText('校园人事部',0,-40);ctx.font='bold 47px "Songti SC",serif';ctx.fillText(r.label,0,20);ctx.font='19px serif';ctx.fillText('★ 娱乐专用 ★',0,65);ctx.restore();
  ctx.fillStyle='#85765c';ctx.font='22px sans-serif';ctx.textAlign='left';ctx.fillText(r.scoring_source,105,1395);wrap(ctx,'仅供校园游戏娱乐，不用于真实招聘。眼神坚定度是回答表现指标，未测量眼神。',105,1440,870,32);
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw new Error('图片导出失败，请重试');
  if(lastUrl)URL.revokeObjectURL(lastUrl);lastUrl=URL.createObjectURL(blob);
  document.querySelector('#export-preview').src=lastUrl;const a=document.querySelector('#download-image');a.href=lastUrl;a.download=`Offer大作战-${r.number}.png`;document.querySelector('#image-dialog').showModal();
}
