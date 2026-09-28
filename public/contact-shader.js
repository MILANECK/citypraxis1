import {VERT,FRAG} from './contact-shader-source.js';

// The supplied React component uses this palette and motion. The site is
// vanilla JavaScript, so the renderer is mounted directly on its canvas.
const settings={
  colors:[
    [.9803921569,.9803921569,.9803921569],
    [.968627451,.843137255,.592156863],
    [.968627451,.752941176,.592156863],
    [.968627451,.752941176,.592156863],
    [.968627451,.752941176,.592156863],
    [.968627451,.752941176,.592156863],
    [.968627451,.752941176,.592156863],
    [.968627451,.752941176,.592156863]
  ],
  colorCount:3,scale:1.5,intensity:.5,paramA:.28,warp:0,detail:1.824,
  contrast:.987,brightness:0,saturation:1,hue:0,vignette:0,blur:0,
  grain:.07,seed:1,rotate:0,offsetX:0,offsetY:0,drift:.12,
  cursorEffect:2,cursorStrength:.3,cursorRadius:.616,oklab:1,timeScale:2
};

export function initContactShader(canvas){
  if(!canvas)return ()=>{};
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl=canvas.getContext('webgl',{antialias:false,alpha:false});
  if(!gl){canvas.classList.add('is-fallback');return ()=>{};}

  let program,buffer,vertexShader,fragmentShader;
  try{
    const compile=(type,source)=>{
      const shader=gl.createShader(type);
      if(!shader)throw new Error('Could not create shader');
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
        const error=gl.getShaderInfoLog(shader)||'Shader compilation failed';
        gl.deleteShader(shader);
        throw new Error(error);
      }
      return shader;
    };
    vertexShader=compile(gl.VERTEX_SHADER,VERT);
    fragmentShader=compile(gl.FRAGMENT_SHADER,FRAG);
    program=gl.createProgram();
    if(!program)throw new Error('Could not create program');
    gl.attachShader(program,vertexShader);
    gl.attachShader(program,fragmentShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Shader link failed');
    gl.deleteShader(vertexShader);vertexShader=null;
    gl.deleteShader(fragmentShader);fragmentShader=null;
    gl.useProgram(program);

    buffer=gl.createBuffer();
    if(!buffer)throw new Error('Could not create vertex buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);

    const uniform=name=>gl.getUniformLocation(program,name);
    const uni={
      colors:uniform('u_colors[0]')||uniform('u_colors'),
      scene:uniform('u_scene'),shape:uniform('u_shape'),
      surface:uniform('u_surface'),finish:uniform('u_finish'),
      transform:uniform('u_transform'),space:uniform('u_space'),
      cursor:uniform('u_cursor')
    };
    gl.uniform3fv(uni.colors,new Float32Array(settings.colors.flat()));
    gl.uniform4f(uni.shape,settings.scale,settings.intensity,settings.paramA,settings.warp);
    gl.uniform4f(uni.surface,settings.detail,settings.contrast,settings.brightness,settings.saturation);
    gl.uniform4f(uni.finish,settings.hue,settings.vignette,settings.blur,settings.grain);
    gl.uniform4f(uni.transform,settings.seed,settings.rotate,settings.drift,settings.oklab);

    let bounds=canvas.getBoundingClientRect();
    let targetX=0,targetY=0,targetPresence=0;
    let mouseX=0,mouseY=0,cursorPresence=0;
    let pointerKnown=false,pointerClientX=0,pointerClientY=0;
    let frame=0,lastNow=null,disposed=false,firstFrame=true;
    let visible=document.visibilityState==='visible',inView=true;
    const start=performance.now();
    const animateTime=!reducedMotion&&Math.abs(settings.timeScale)>.0001;

    const resizeCanvas=()=>{
      const dpr=Math.min(devicePixelRatio||1,2);
      const rawWidth=Math.max(1,Math.round(bounds.width*dpr));
      const rawHeight=Math.max(1,Math.round(bounds.height*dpr));
      const scale=Math.min(1,Math.sqrt(2_000_000/Math.max(1,rawWidth*rawHeight)));
      const width=Math.max(1,Math.round(rawWidth*scale));
      const height=Math.max(1,Math.round(rawHeight*scale));
      if(canvas.width!==width||canvas.height!==height){
        canvas.width=width;canvas.height=height;
        gl.viewport(0,0,width,height);
      }
    };
    const requestRender=()=>{
      if(!disposed&&visible&&inView&&!frame)frame=requestAnimationFrame(render);
    };
    const updatePointerTarget=()=>{
      if(!pointerKnown||!bounds.width||!bounds.height)return;
      const inside=pointerClientX>=bounds.left&&pointerClientX<=bounds.right&&pointerClientY>=bounds.top&&pointerClientY<=bounds.bottom;
      if(!inside){targetPresence=0;requestRender();return;}
      const x=(pointerClientX-bounds.left)/bounds.width*2-1;
      const y=-((pointerClientY-bounds.top)/bounds.height*2-1);
      if(!targetPresence&&cursorPresence<.01){mouseX=x;mouseY=y;}
      targetX=x;targetY=y;targetPresence=1;
      requestRender();
    };
    const onPointerMove=event=>{
      pointerKnown=true;pointerClientX=event.clientX;pointerClientY=event.clientY;
      bounds=canvas.getBoundingClientRect();updatePointerTarget();
    };
    const onPointerLeave=()=>{pointerKnown=false;targetPresence=0;requestRender();};
    const updateLayout=()=>{
      bounds=canvas.getBoundingClientRect();resizeCanvas();updatePointerTarget();requestRender();
    };
    const onVisibilityChange=()=>{
      visible=document.visibilityState==='visible';
      if(visible)requestRender();
      else if(frame){cancelAnimationFrame(frame);frame=0;lastNow=null;}
    };
    const onContextLost=event=>{
      event.preventDefault();
      if(frame)cancelAnimationFrame(frame);
      frame=0;canvas.classList.remove('is-ready');canvas.classList.add('is-fallback');
    };
    function render(now){
      frame=0;
      if(disposed||!visible||!inView)return;
      const dt=lastNow===null?0:Math.min((now-lastNow)/1000,.1);
      lastNow=now;
      const follow=1-Math.exp(-12*dt);
      mouseX+=(targetX-mouseX)*follow;
      mouseY+=(targetY-mouseY)*follow;
      cursorPresence+=(targetPresence-cursorPresence)*follow;
      resizeCanvas();
      gl.uniform4f(uni.scene,canvas.width,canvas.height,animateTime?(now-start)/1000*settings.timeScale:0,settings.colorCount);
      gl.uniform4f(uni.space,settings.offsetX,settings.offsetY,mouseX,mouseY);
      gl.uniform4f(uni.cursor,reducedMotion?0:cursorPresence,settings.cursorEffect,settings.cursorStrength,settings.cursorRadius);
      gl.drawArrays(gl.TRIANGLES,0,3);
      if(firstFrame){firstFrame=false;canvas.classList.add('is-ready');}
      const pointerSettling=Math.abs(targetX-mouseX)>.001||Math.abs(targetY-mouseY)>.001||Math.abs(targetPresence-cursorPresence)>.001;
      if(animateTime||pointerSettling)requestRender();
      else lastNow=null;
    }

    addEventListener('resize',updateLayout);
    if(!reducedMotion){
      addEventListener('pointermove',onPointerMove,{passive:true});
      addEventListener('pointercancel',onPointerLeave);
      addEventListener('scroll',updateLayout,true);
      addEventListener('blur',onPointerLeave);
      document.documentElement.addEventListener('pointerleave',onPointerLeave);
    }
    document.addEventListener('visibilitychange',onVisibilityChange);
    canvas.addEventListener('webglcontextlost',onContextLost);
    const resizeObserver=new ResizeObserver(updateLayout);
    resizeObserver.observe(canvas);
    const intersectionObserver=new IntersectionObserver(([entry])=>{
      inView=entry?.isIntersecting??true;
      if(inView)requestRender();
      else if(frame){cancelAnimationFrame(frame);frame=0;lastNow=null;}
    });
    intersectionObserver.observe(canvas);
    updateLayout();

    return ()=>{
      disposed=true;
      if(frame)cancelAnimationFrame(frame);
      resizeObserver.disconnect();intersectionObserver.disconnect();
      removeEventListener('resize',updateLayout);
      document.removeEventListener('visibilitychange',onVisibilityChange);
      canvas.removeEventListener('webglcontextlost',onContextLost);
      if(!reducedMotion){
        removeEventListener('pointermove',onPointerMove);
        removeEventListener('pointercancel',onPointerLeave);
        removeEventListener('scroll',updateLayout,true);
        removeEventListener('blur',onPointerLeave);
        document.documentElement.removeEventListener('pointerleave',onPointerLeave);
      }
      gl.deleteBuffer(buffer);gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }catch(error){
    if(vertexShader)gl.deleteShader(vertexShader);
    if(fragmentShader)gl.deleteShader(fragmentShader);
    if(buffer)gl.deleteBuffer(buffer);
    if(program)gl.deleteProgram(program);
    canvas.classList.add('is-fallback');
    console.warn('Contact background shader unavailable:',error);
    return ()=>{};
  }
}
