export function videoFirstFrame(file,name){
  return new Promise((resolve,reject)=>{
    const video=document.createElement('video');
    const url=URL.createObjectURL(file);
    let settled=false;
    const finish=(error,poster)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timeout);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      if(error)reject(error);else resolve(poster);
    };
    const timeout=setTimeout(()=>finish(new Error('Standbild konnte nicht erstellt werden.')),15000);
    video.muted=true;
    video.playsInline=true;
    video.preload='auto';
    video.addEventListener('loadeddata',()=>{
      try{
        if(!video.videoWidth||!video.videoHeight)throw new Error('Video enthält kein sichtbares Bild.');
        const scale=Math.min(1,1600/video.videoWidth);
        const canvas=document.createElement('canvas');
        canvas.width=Math.round(video.videoWidth*scale);
        canvas.height=Math.round(video.videoHeight*scale);
        const context=canvas.getContext('2d');
        if(!context)throw new Error('Standbild konnte nicht erstellt werden.');
        context.drawImage(video,0,0,canvas.width,canvas.height);
        canvas.toBlob(blob=>{
          if(!blob){finish(new Error('Standbild konnte nicht erstellt werden.'));return;}
          finish(null,new File([blob],name,{type:'image/jpeg'}));
        },'image/jpeg',.86);
      }catch(error){finish(error);}
    },{once:true});
    video.addEventListener('error',()=>finish(new Error('Video konnte für das Standbild nicht gelesen werden.')),{once:true});
    video.src=url;
    video.load();
  });
}
