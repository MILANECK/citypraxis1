import {VERT,FRAG} from './contact-shader-source.js?v=mesh-3';

// The supplied React component uses this palette and motion. The site is
// vanilla JavaScript, so the renderer is mounted directly on its canvas.
const contactSettings={
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

const landingSettings={
  ...contactSettings,
  colors:[
    [1,1,1],
    [0,.56,.76],
    [.59,.08,.50],
    [.83,.72,.58],
    ...contactSettings.colors.slice(4)
  ],
  colorCount:4,paramA:2,grain:.07,drift:0,cursorStrength:.3,timeScale:1
};

// The team and booking pages use the contact composition and motion.
const teamSettings={
  ...contactSettings,
  colors:[
    [.975,.980,.985],
    [.584,.106,.506],
    [.455,.300,.620],
    [.667,.851,.922],
    ...contactSettings.colors.slice(4)
  ],
  colorCount:4,offsetX:-.42
};
const bookingSettings={...teamSettings,offsetX:-.18};

export function initContactShader(canvas,{preset='contact'}={}){
  if(!canvas)return ()=>{};
  const settings=preset==='contact'?contactSettings:preset==='team'?teamSettings:preset==='booking'?bookingSettings:landingSettings;
  const pageSurface=preset==='interior'?canvas.closest('.home-surface'):null;
  // Keep the mesh still on touch/mobile devices and for reduced-motion users.
  const staticScene=matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px), (pointer: coarse)').matches;
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
    let visible=document.visibilityState==='visible',inView=preset!=='landing',fadeVisible=!pageSurface;
    const start=performance.now();
    const animateTime=!staticScene&&Math.abs(settings.timeScale)>.0001;

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
      if(!disposed&&visible&&inView&&(fadeVisible||staticScene)&&!frame)frame=requestAnimationFrame(render);
    };
    const updatePageFade=()=>{
      if(!pageSurface)return;
      const page=pageSurface.getBoundingClientRect();
      const height=Math.max(page.height,innerHeight);
      const fadeStart=page.top+height*.4;
      canvas.style.setProperty('--mesh-fade-start',`${Math.round(fadeStart)}px`);
      canvas.style.setProperty('--mesh-fade-end',`${Math.round(page.top+height*.9)}px`);
      const wasVisible=fadeVisible;
      fadeVisible=fadeStart<innerHeight;
      if(!fadeVisible&&frame&&!staticScene){cancelAnimationFrame(frame);frame=0;lastNow=null;}
      else if(fadeVisible&&!wasVisible)requestRender();
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
      bounds=canvas.getBoundingClientRect();resizeCanvas();updatePageFade();updatePointerTarget();requestRender();
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
      if(disposed||!visible||!inView||(!fadeVisible&&!staticScene))return;
      const dt=lastNow===null?0:Math.min((now-lastNow)/1000,.1);
      lastNow=now;
      const follow=1-Math.exp(-12*dt);
      mouseX+=(targetX-mouseX)*follow;
      mouseY+=(targetY-mouseY)*follow;
      cursorPresence+=(targetPresence-cursorPresence)*follow;
      resizeCanvas();
      gl.uniform4f(uni.scene,canvas.width,canvas.height,animateTime?(now-start)/1000*settings.timeScale:0,settings.colorCount);
      gl.uniform4f(uni.space,settings.offsetX,settings.offsetY,mouseX,mouseY);
      gl.uniform4f(uni.cursor,staticScene?0:cursorPresence,settings.cursorEffect,settings.cursorStrength,settings.cursorRadius);
      gl.drawArrays(gl.TRIANGLES,0,3);
      if(firstFrame){firstFrame=false;canvas.classList.add('is-ready');}
      const pointerSettling=Math.abs(targetX-mouseX)>.001||Math.abs(targetY-mouseY)>.001||Math.abs(targetPresence-cursorPresence)>.001;
      if(animateTime||pointerSettling)requestRender();
      else lastNow=null;
    }

    addEventListener('resize',updateLayout);
    if(!staticScene){
      addEventListener('pointermove',onPointerMove,{passive:true});
      addEventListener('pointercancel',onPointerLeave);
      addEventListener('scroll',updateLayout,true);
      addEventListener('blur',onPointerLeave);
      document.documentElement.addEventListener('pointerleave',onPointerLeave);
    }else if(pageSurface){
      addEventListener('scroll',updatePageFade,{passive:true});
    }
    document.addEventListener('visibilitychange',onVisibilityChange);
    canvas.addEventListener('webglcontextlost',onContextLost);
    const resizeObserver=new ResizeObserver(updateLayout);
    resizeObserver.observe(canvas);
    if(pageSurface)resizeObserver.observe(pageSurface);
    const observed=preset==='landing'?[document.querySelector('.team-feature'),document.querySelector('.home-price-wrap')].filter(Boolean):[canvas];
    const intersections=new Map(observed.map(node=>[node,false]));
    const intersectionObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>intersections.set(entry.target,entry.isIntersecting));
      inView=[...intersections.values()].some(Boolean);
      if(inView)requestRender();
      else if(frame){cancelAnimationFrame(frame);frame=0;lastNow=null;}
    });
    (observed.length?observed:[canvas]).forEach(node=>intersectionObserver.observe(node));
    updateLayout();

    return ()=>{
      disposed=true;
      if(frame)cancelAnimationFrame(frame);
      resizeObserver.disconnect();intersectionObserver.disconnect();
      removeEventListener('resize',updateLayout);
      document.removeEventListener('visibilitychange',onVisibilityChange);
      canvas.removeEventListener('webglcontextlost',onContextLost);
      if(!staticScene){
        removeEventListener('pointermove',onPointerMove);
        removeEventListener('pointercancel',onPointerLeave);
        removeEventListener('scroll',updateLayout,true);
        removeEventListener('blur',onPointerLeave);
        document.documentElement.removeEventListener('pointerleave',onPointerLeave);
      }else if(pageSurface){
        removeEventListener('scroll',updatePageFade);
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
