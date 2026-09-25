function e() {
	return "precision highp float;\nattribute vec3 position;\nattribute vec3 normal;\nattribute vec2 uv;\nuniform mat4 modelViewMatrix;\nuniform mat4 projectionMatrix;\nvarying vec2 vUv;\nvarying vec2 vFlowUv;\nvarying vec4 v_new_position;\nvarying vec3 v_color;\nvarying float v_displacement_amount;\nvarying vec3 vNormal;\nvarying vec3 vPosition;\nvarying vec2 v_edge;\nuniform float u_time;\nuniform vec2 u_resolution;\nuniform vec2 u_color_pressure;\nuniform float u_wave_frequency_x;\nuniform float u_wave_frequency_y;\nuniform float u_wave_amplitude;\nuniform float u_wave2_frequency_x;\nuniform float u_wave2_frequency_y;\nuniform float u_wave2_amplitude;\nuniform float u_wave2_speed;\nuniform float u_wave2_angle;\nuniform float u_plane_width;\nuniform float u_plane_height;\nuniform float u_color_blending;\nuniform int u_colors_count;\nstruct ColorStop {\nfloat is_active;\nvec3 color;\nfloat influence;\n};\nuniform ColorStop u_colors[6];\nuniform float u_y_offset;\nuniform float u_y_offset_wave_multiplier;\nuniform float u_y_offset_color_multiplier;\nuniform float u_y_offset_flow_multiplier;\nuniform float u_flow_distortion_a;\nuniform float u_flow_distortion_b;\nuniform float u_flow_scale;\nuniform float u_flow_ease;\nuniform float u_flow_enabled;\nuniform float u_fresnel_enabled;\nuniform float u_fresnel_power;\nuniform float u_fresnel_intensity;\nuniform vec3 u_fresnel_color;\nuniform float u_shape_type;\nuniform float u_flat_shading;";
}
function t() {
	return "precision highp float;\nvarying vec2 vUv;\nvarying vec2 vFlowUv;\nvarying vec4 v_new_position;\nvarying vec3 v_color;\nvarying float v_displacement_amount;\nvarying vec3 vNormal;\nvarying vec3 vPosition;\nvarying vec2 v_edge;\nuniform float u_time;\nuniform vec2 u_resolution;\nuniform float u_plane_height;\nuniform float u_shadows;\nuniform float u_highlights;\nuniform float u_saturation;\nuniform float u_brightness;\nuniform float u_grain_intensity;\nuniform float u_grain_sparsity;\nuniform float u_grain_scale;\nuniform float u_grain_speed;\nuniform float u_y_offset;\nuniform float u_y_offset_color_multiplier;\nuniform float u_flow_distortion_a;\nuniform float u_flow_distortion_b;\nuniform float u_flow_scale;\nuniform sampler2D u_procedural_texture;\nuniform float u_enable_procedural_texture;\nuniform float u_texture_ease;\nuniform float u_domain_warp_enabled;\nuniform float u_domain_warp_intensity;\nuniform float u_domain_warp_scale;\nuniform float u_vignette_intensity;\nuniform float u_vignette_radius;\nuniform float u_fresnel_enabled;\nuniform float u_fresnel_power;\nuniform float u_fresnel_intensity;\nuniform vec3 u_fresnel_color;\nuniform float u_iridescence_enabled;\nuniform float u_iridescence_intensity;\nuniform float u_iridescence_speed;\nuniform float u_prism_edge_intensity;\nuniform float u_prism_edge_thinness;\nuniform float u_prism_edge_spread;\nuniform float u_prism_edge_speed;\nuniform float u_prism_edge_ripple;\nuniform float u_bloom_intensity;\nuniform float u_bloom_threshold;\nuniform float u_chromatic_aberration;\nuniform float u_shape_type;\nuniform float u_transparent_texture_void;\nuniform float u_silhouette_fade;\nuniform float u_cylinder_fade;\nuniform float u_ribbon_fade;\nuniform float u_flat_shading;";
}
function n() {
	return "vec4 permute(vec4 x) {\nreturn floor(fract(sin(x) * 43758.5453123) * 289.0);\n}\nvec4 taylorInvSqrt(vec4 r) {\nreturn 1.79284291400159 - 0.85373472095314 * r;\n}\nvec3 fade(vec3 t) {\nreturn t*t*t*(t*(t*6.0-15.0)+10.0);\n}\nfloat snoise(vec3 v) {\nconst vec2 C = vec2(1.0/6.0, 1.0/3.0) ;\nconst vec4 D = vec4(0.0, 0.5, 1.0, 2.0);\nvec3 i = floor(v + dot(v, C.yyy) );\nvec3 x0 = v - i + dot(i, C.xxx) ;\nvec3 g = step(x0.yzx, x0.xyz);\nvec3 l = 1.0 - g;\nvec3 i1 = min( g.xyz, l.zxy );\nvec3 i2 = max( g.xyz, l.zxy );\nvec3 x1 = x0 - i1 + C.xxx;\nvec3 x2 = x0 - i2 + C.yyy;\nvec3 x3 = x0 - D.yyy;\nvec4 p = permute( permute( permute(\ni.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n+ i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\nfloat n_ = 0.142857142857;\nvec3 ns = n_ * D.wyz - D.xzx;\nvec4 j = p - 49.0 * floor(p * ns.z * ns.z);\nvec4 x_ = floor(j * ns.z);\nvec4 y_ = floor(j - 7.0 * x_ );\nvec4 x = x_ *ns.x + ns.yyyy;\nvec4 y = y_ *ns.x + ns.yyyy;\nvec4 h = 1.0 - abs(x) - abs(y);\nvec4 b0 = vec4( x.xy, y.xy );\nvec4 b1 = vec4( x.zw, y.zw );\nvec4 s0 = floor(b0)*2.0 + 1.0;\nvec4 s1 = floor(b1)*2.0 + 1.0;\nvec4 sh = -step(h, vec4(0.0));\nvec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\nvec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;\nvec3 p0 = vec3(a0.xy,h.x);\nvec3 p1 = vec3(a0.zw,h.y);\nvec3 p2 = vec3(a1.xy,h.z);\nvec3 p3 = vec3(a1.zw,h.w);\nvec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\np0 *= norm.x;\np1 *= norm.y;\np2 *= norm.z;\np3 *= norm.w;\nvec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\nm = m * m;\nreturn 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),\ndot(p2,x2), dot(p3,x3) ) );\n}\nfloat cnoise(vec3 P)\n{\nvec3 Pi0 = floor(P);\nvec3 Pi1 = Pi0 + vec3(1.0);\nvec3 Pf0 = fract(P);\nvec3 Pf1 = Pf0 - vec3(1.0);\nvec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\nvec4 iy = vec4(Pi0.yy, Pi1.yy);\nvec4 iz0 = Pi0.zzzz;\nvec4 iz1 = Pi1.zzzz;\nvec4 ixy = permute(permute(ix) + iy);\nvec4 ixy0 = permute(ixy + iz0);\nvec4 ixy1 = permute(ixy + iz1);\nvec4 gx0 = ixy0 * (1.0 / 7.0);\nvec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;\ngx0 = fract(gx0);\nvec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\nvec4 sz0 = step(gz0, vec4(0.0));\ngx0 -= sz0 * (step(0.0, gx0) - 0.5);\ngy0 -= sz0 * (step(0.0, gy0) - 0.5);\nvec4 gx1 = ixy1 * (1.0 / 7.0);\nvec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;\ngx1 = fract(gx1);\nvec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\nvec4 sz1 = step(gz1, vec4(0.0));\ngx1 -= sz1 * (step(0.0, gx1) - 0.5);\ngy1 -= sz1 * (step(0.0, gy1) - 0.5);\nvec3 g000 = vec3(gx0.x,gy0.x,gz0.x);\nvec3 g100 = vec3(gx0.y,gy0.y,gz0.y);\nvec3 g010 = vec3(gx0.z,gy0.z,gz0.z);\nvec3 g110 = vec3(gx0.w,gy0.w,gz0.w);\nvec3 g001 = vec3(gx1.x,gy1.x,gz1.x);\nvec3 g101 = vec3(gx1.y,gy1.y,gz1.y);\nvec3 g011 = vec3(gx1.z,gy1.z,gz1.z);\nvec3 g111 = vec3(gx1.w,gy1.w,gz1.w);\nvec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\ng000 *= norm0.x;\ng010 *= norm0.y;\ng100 *= norm0.z;\ng110 *= norm0.w;\nvec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\ng001 *= norm1.x;\ng011 *= norm1.y;\ng101 *= norm1.z;\ng111 *= norm1.w;\nfloat n000 = dot(g000, Pf0);\nfloat n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\nfloat n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\nfloat n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\nfloat n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\nfloat n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\nfloat n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\nfloat n111 = dot(g111, Pf1);\nvec3 fade_xyz = fade(Pf0);\nvec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\nvec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\nfloat n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);\nreturn 2.2 * n_xyz;\n}";
}
function r() {
	return "vec3 saturation(vec3 rgb, float adjustment) {\nconst vec3 W = vec3(0.2125, 0.7154, 0.0721);\nvec3 intensity = vec3(dot(rgb, W));\nreturn mix(intensity, rgb, adjustment);\n}";
}
//#endregion
//#region src/math.ts
var i = class {
	elements;
	constructor() {
		this.elements = new Float32Array([
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1
		]);
	}
	identity() {
		let e = this.elements;
		return e[0] = 1, e[1] = 0, e[2] = 0, e[3] = 0, e[4] = 0, e[5] = 1, e[6] = 0, e[7] = 0, e[8] = 0, e[9] = 0, e[10] = 1, e[11] = 0, e[12] = 0, e[13] = 0, e[14] = 0, e[15] = 1, this;
	}
	translate(e, t, n) {
		return this.elements[12] += this.elements[0] * e + this.elements[4] * t + this.elements[8] * n, this.elements[13] += this.elements[1] * e + this.elements[5] * t + this.elements[9] * n, this.elements[14] += this.elements[2] * e + this.elements[6] * t + this.elements[10] * n, this.elements[15] += this.elements[3] * e + this.elements[7] * t + this.elements[11] * n, this;
	}
	rotateX(e) {
		let t = Math.cos(e), n = Math.sin(e), r = this.elements[4], i = this.elements[5], a = this.elements[6], o = this.elements[7], s = this.elements[8], c = this.elements[9], l = this.elements[10], u = this.elements[11];
		return this.elements[4] = t * r + n * s, this.elements[5] = t * i + n * c, this.elements[6] = t * a + n * l, this.elements[7] = t * o + n * u, this.elements[8] = t * s - n * r, this.elements[9] = t * c - n * i, this.elements[10] = t * l - n * a, this.elements[11] = t * u - n * o, this;
	}
	rotateY(e) {
		let t = Math.cos(e), n = Math.sin(e), r = this.elements[0], i = this.elements[1], a = this.elements[2], o = this.elements[3], s = this.elements[8], c = this.elements[9], l = this.elements[10], u = this.elements[11];
		return this.elements[0] = t * r - n * s, this.elements[1] = t * i - n * c, this.elements[2] = t * a - n * l, this.elements[3] = t * o - n * u, this.elements[8] = n * r + t * s, this.elements[9] = n * i + t * c, this.elements[10] = n * a + t * l, this.elements[11] = n * o + t * u, this;
	}
	rotateZ(e) {
		let t = Math.cos(e), n = Math.sin(e), r = this.elements[0], i = this.elements[1], a = this.elements[2], o = this.elements[3], s = this.elements[4], c = this.elements[5], l = this.elements[6], u = this.elements[7];
		return this.elements[0] = t * r + n * s, this.elements[1] = t * i + n * c, this.elements[2] = t * a + n * l, this.elements[3] = t * o + n * u, this.elements[4] = -n * r + t * s, this.elements[5] = -n * i + t * c, this.elements[6] = -n * a + t * l, this.elements[7] = -n * o + t * u, this;
	}
}, a = class {
	left;
	right;
	top;
	bottom;
	near;
	far;
	position;
	projectionMatrix;
	zoom;
	constructor(e, t, n, r, a, o) {
		this.left = e, this.right = t, this.top = n, this.bottom = r, this.near = a, this.far = o, this.position = [
			0,
			0,
			0
		], this.zoom = 1, this.projectionMatrix = new i(), this.updateProjectionMatrix();
	}
	updateProjectionMatrix() {
		let e = 1 / (this.right - this.left), t = 1 / (this.top - this.bottom), n = 1 / (this.far - this.near), r = (this.right + this.left) * e, i = (this.top + this.bottom) * t, a = (this.far + this.near) * n;
		this.projectionMatrix.elements = new Float32Array([
			2 * e,
			0,
			0,
			0,
			0,
			2 * t,
			0,
			0,
			0,
			0,
			-2 * n,
			0,
			-r,
			-i,
			-a,
			1
		]);
	}
};
function o(e, t, n, r = 50, i = 50, a = "plane", o = 1) {
	e.zoom = o;
	let s = t / n;
	if (a === "plane") {
		let a = t * n / 1e6 * r * i / 1.5, o = Math.sqrt(a * s), c = a / o, l = -r / 2, u = Math.min((l + o) / 1.5, r / 2), d = i / 4, f = Math.max((d - c) / 2, -i / 4);
		if (s < 1) {
			let e = s;
			l *= e, u *= e;
			let t = 1.05;
			l *= t, u *= t, d *= t, f *= t;
		}
		e.left = l, e.right = u, e.top = d, e.bottom = f;
	} else {
		let t = 25;
		if (a === "sphere" ? t = 30 : a === "torus" ? t = 35 : a === "cylinder" && (t = 30), s >= 1) e.left = -t * s, e.right = t * s, e.top = t, e.bottom = -t;
		else {
			e.left = -t, e.right = t, e.top = t / s, e.bottom = -t / s;
			let n = 1.05;
			e.left *= n, e.right *= n, e.top *= n, e.bottom *= n;
		}
	}
	e.left /= o, e.right /= o, e.top /= o, e.bottom /= o, e.near = -100, e.far = 1e3, e.updateProjectionMatrix();
}
function s(e, t, n, r) {
	let i = e / 2, a = t / 2, o = Math.floor(n), s = Math.floor(r), c = o + 1, l = s + 1, u = e / o, d = t / s, f = [], p = [], m = [], h = [];
	for (let e = 0; e < l; e++) {
		let t = e * d - a;
		for (let n = 0; n < c; n++) {
			let r = n * u - i;
			p.push(r, -t, 0), m.push(0, 0, 1), h.push(n / o), h.push(1 - e / s);
		}
	}
	for (let e = 0; e < s; e++) for (let t = 0; t < o; t++) {
		let n = t + c * e, r = t + c * (e + 1), i = t + 1 + c * (e + 1), a = t + 1 + c * e;
		f.push(n, r, a), f.push(r, i, a);
	}
	let g = p.length / 3 > 65535, _ = [];
	for (let e = 0; e < f.length; e += 3) {
		let t = f[e], n = f[e + 1], r = f[e + 2];
		_.push(t, n, n, r, r, t);
	}
	return {
		position: new Float32Array(p),
		normal: new Float32Array(m),
		uv: new Float32Array(h),
		index: g ? new Uint32Array(f) : new Uint16Array(f),
		wireframeIndex: g ? new Uint32Array(_) : new Uint16Array(_)
	};
}
function c(e, t, n) {
	let r = [], i = [], a = [], o = [], s = Math.floor(t), c = Math.floor(n);
	for (let t = 0; t <= c; t++) {
		let n = t / c, o = n * Math.PI;
		for (let t = 0; t <= s; t++) {
			let c = t / s, l = c * Math.PI * 2, u = -e * Math.sin(o) * Math.cos(l), d = e * Math.cos(o), f = e * Math.sin(o) * Math.sin(l);
			r.push(u, d, f);
			let p = Math.sqrt(u * u + d * d + f * f);
			i.push(u / p, d / p, f / p), a.push(c, 1 - n);
		}
	}
	for (let e = 0; e < c; e++) for (let t = 0; t < s; t++) {
		let n = t + (s + 1) * e, r = t + (s + 1) * (e + 1), i = t + 1 + (s + 1) * (e + 1), a = t + 1 + (s + 1) * e;
		o.push(n, r, a), o.push(r, i, a);
	}
	let l = r.length / 3 > 65535, u = [];
	for (let e = 0; e < o.length; e += 3) {
		let t = o[e], n = o[e + 1], r = o[e + 2];
		u.push(t, n, n, r, r, t);
	}
	return {
		position: new Float32Array(r),
		normal: new Float32Array(i),
		uv: new Float32Array(a),
		index: l ? new Uint32Array(o) : new Uint16Array(o),
		wireframeIndex: l ? new Uint32Array(u) : new Uint16Array(u)
	};
}
function l(e, t, n, r) {
	let i = [], a = [], o = [], s = [], c = Math.floor(n), l = Math.floor(r);
	for (let n = 0; n <= c; n++) {
		let r = n / c * Math.PI * 2;
		for (let s = 0; s <= l; s++) {
			let u = s / l * Math.PI * 2, d = (e + t * Math.cos(r)) * Math.cos(u), f = (e + t * Math.cos(r)) * Math.sin(u), p = t * Math.sin(r);
			i.push(d, f, p);
			let m = e * Math.cos(u), h = e * Math.sin(u), g = d - m, _ = f - h, v = p, y = Math.sqrt(g * g + _ * _ + v * v);
			a.push(g / y, _ / y, v / y), o.push(s / l, n / c);
		}
	}
	for (let e = 1; e <= c; e++) for (let t = 1; t <= l; t++) {
		let n = (l + 1) * e + t - 1, r = (l + 1) * (e - 1) + t - 1, i = (l + 1) * (e - 1) + t, a = (l + 1) * e + t;
		s.push(n, r, a), s.push(r, i, a);
	}
	let u = i.length / 3 > 65535, d = [];
	for (let e = 0; e < s.length; e += 3) {
		let t = s[e], n = s[e + 1], r = s[e + 2];
		d.push(t, n, n, r, r, t);
	}
	return {
		position: new Float32Array(i),
		normal: new Float32Array(a),
		uv: new Float32Array(o),
		index: u ? new Uint32Array(s) : new Uint16Array(s),
		wireframeIndex: u ? new Uint32Array(d) : new Uint16Array(d)
	};
}
function u(e, t, n, r, i) {
	let a = [], o = [], s = [], c = [], l = Math.floor(r), u = Math.floor(i), d = n / 2;
	for (let r = 0; r <= u; r++) {
		let i = r / u, c = i * n - d, f = i * (t - e) + e;
		for (let e = 0; e <= l; e++) {
			let t = e / l, n = t * Math.PI * 2, r = Math.sin(n), u = Math.cos(n);
			a.push(f * r, -c, f * u), o.push(r, 0, u), s.push(t, 1 - i);
		}
	}
	for (let e = 0; e < u; e++) for (let t = 0; t < l; t++) {
		let n = t + (l + 1) * e, r = t + (l + 1) * (e + 1), i = t + 1 + (l + 1) * (e + 1), a = t + 1 + (l + 1) * e;
		c.push(n, r, a), c.push(r, i, a);
	}
	let f = a.length / 3 > 65535, p = [];
	for (let e = 0; e < c.length; e += 3) {
		let t = c[e], n = c[e + 1], r = c[e + 2];
		p.push(t, n, n, r, r, t);
	}
	return {
		position: new Float32Array(a),
		normal: new Float32Array(o),
		uv: new Float32Array(s),
		index: f ? new Uint32Array(c) : new Uint16Array(c),
		wireframeIndex: f ? new Uint32Array(p) : new Uint16Array(p)
	};
}
function d(e, t, n, r, i, a) {
	let o = e / 2, s = t / 2, c = Math.floor(n), l = Math.floor(r), u = c + 1, d = l + 1, f = e / c, p = t / l, m = [], h = [], g = [], _ = [];
	for (let n = 0; n < d; n++) {
		let r = n * p - s;
		for (let s = 0; s < u; s++) {
			let u = s * f - o, d = u, p = r, _ = 0, v = 0, y = 1;
			if (Math.abs(i) > .001) {
				let t = e / i, n = u / t;
				d = t * Math.sin(n), _ = t * (1 - Math.cos(n)), v = Math.sin(n), y = Math.cos(n);
			}
			if (Math.abs(a) > .001) {
				let e = r / t * a, n = Math.cos(e), i = Math.sin(e), o = d * n - _ * i, s = d * i + _ * n;
				d = o, _ = s;
				let c = v * n - y * i, l = v * i + y * n;
				v = c, y = l;
			}
			m.push(d, -p, _), h.push(v, 0, y), g.push(s / c), g.push(1 - n / l);
		}
	}
	for (let e = 0; e < l; e++) for (let t = 0; t < c; t++) {
		let n = t + u * e, r = t + u * (e + 1), i = t + 1 + u * (e + 1), a = t + 1 + u * e;
		_.push(n, r, a), _.push(r, i, a);
	}
	let v = m.length / 3 > 65535, y = [];
	for (let e = 0; e < _.length; e += 3) {
		let t = _[e], n = _[e + 1], r = _[e + 2];
		y.push(t, n, n, r, r, t);
	}
	return {
		position: new Float32Array(m),
		normal: new Float32Array(h),
		uv: new Float32Array(g),
		index: v ? new Uint32Array(_) : new Uint16Array(_),
		wireframeIndex: v ? new Uint32Array(y) : new Uint16Array(y)
	};
}
//#endregion
//#region src/license.ts
var f = {
	kty: "EC",
	crv: "P-256",
	x: "n9A9jNvLNR6QJaPP4ZdpbXtPFz3ASUfeeQm11Jd53Rg",
	y: "EoG5ezJ3hr4c62JjpsyabotdFeU-A1LyH-qHyabnKc0",
	key_ops: ["verify"],
	ext: !0
};
function p(e) {
	let t = e.replace(/-/g, "+").replace(/_/g, "/");
	for (; t.length % 4 != 0;) t += "=";
	let n = atob(t), r = new Uint8Array(n.length);
	for (let e = 0; e < n.length; e++) r[e] = n.charCodeAt(e);
	return r;
}
var m = "neat.firecms.co";
function h(e) {
	if (typeof window > "u" || !window.location) return !0;
	let t = window.location.hostname.toLowerCase(), n = e.toLowerCase();
	return !!(t === "localhost" || t === "127.0.0.1" || t === "0.0.0.0" || t === "[::1]" || t.endsWith(".localhost") || t === m || t === n || t.endsWith("." + n));
}
async function g(e) {
	try {
		if (typeof crypto > "u" || !crypto.subtle || typeof crypto.subtle.verify != "function") return {
			valid: !1,
			reason: "Web Crypto API not available (page must be served over HTTPS)"
		};
		let t = e.trim();
		if (!t.startsWith("NEAT-")) return {
			valid: !1,
			reason: "Key must start with \"NEAT-\" prefix"
		};
		let n = t.slice(5), r = n.indexOf(".");
		if (r === -1) return {
			valid: !1,
			reason: "Invalid key format: missing separator"
		};
		let i = n.slice(0, r), a = n.slice(r + 1);
		if (!i || !a) return {
			valid: !1,
			reason: "Invalid key format: empty payload or signature"
		};
		let o = p(i), s = new TextDecoder().decode(o), c = JSON.parse(s);
		if (!c.domain || typeof c.domain != "string") return {
			valid: !1,
			reason: "Invalid payload: missing domain"
		};
		if (!h(c.domain)) {
			let e = typeof window < "u" && window.location ? window.location.hostname : "unknown";
			return {
				valid: !1,
				reason: `Domain mismatch: key is for "${c.domain}" but current hostname is "${e}"`
			};
		}
		let l = p(a), u = await crypto.subtle.importKey("jwk", f, {
			name: "ECDSA",
			namedCurve: "P-256"
		}, !1, ["verify"]);
		return await crypto.subtle.verify({
			name: "ECDSA",
			hash: "SHA-256"
		}, u, l, o) ? {
			valid: !0,
			payload: c
		} : {
			valid: !1,
			reason: "Signature verification failed"
		};
	} catch (e) {
		return {
			valid: !1,
			reason: `Unexpected error: ${e instanceof Error ? e.message : String(e)}`
		};
	}
}
//#endregion
//#region src/version.ts
var _ = "1.1.0";
//#endregion
//#region src/pattern.ts
function v(e) {
	let t = parseInt(e.replace("#", ""), 16);
	return {
		r: t >> 16 & 255,
		g: t >> 8 & 255,
		b: t & 255
	};
}
function y(e, t, n) {
	return "#" + ((1 << 24) + (Math.round(e) << 16) + (Math.round(t) << 8) + Math.round(n)).toString(16).slice(1).padStart(6, "0");
}
function b(e) {
	let { size: t, seed: n, colorBlending: r, baseColor: i, tile: a, transparentVoid: o } = e, s = n;
	function c() {
		let e = Math.sin(s++) * 1e4;
		return e - Math.floor(e);
	}
	let l = e.colors.filter((e) => e.enabled).map((e) => e.color);
	if (l.length === 0) return null;
	let u = () => {
		let e = l[Math.floor(c() * l.length)], t = l[Math.floor(c() * l.length)], n = c() * r, i = v(e), a = v(t);
		return y(i.r + (a.r - i.r) * n, i.g + (a.g - i.g) * n, i.b + (a.b - i.b) * n);
	}, d = [u(), u()], f = [];
	for (let n = 0; n < e.triangles; n++) {
		let e = u(), n = c() * t, r = c() * t, i = 100 + c() * 300;
		f.push({
			kind: "triangle",
			x: n,
			y: r,
			x1: (c() - .5) * i,
			y1: (c() - .5) * i,
			x2: (c() - .5) * i,
			y2: (c() - .5) * i,
			color: e
		});
	}
	for (let n = 0; n < e.circles; n++) {
		let e = u(), n = 10 + c() * 50, r = c() * t, i = c() * t, a = 50 + c() * 150;
		f.push({
			kind: "circle",
			x: r,
			y: i,
			r: a,
			lineWidth: n,
			color: e
		});
	}
	for (let n = 0; n < e.bars; n++) {
		let e = u(), n = c() * t, r = c() * t, i = c() * Math.PI;
		f.push({
			kind: "bar",
			x: n,
			y: r,
			rot: i,
			width: 300,
			height: 50,
			color: e
		});
	}
	for (let n = 0; n < e.squiggles; n++) {
		let e = u(), n = c() * t, r = c() * t, i = [], a = 0, o = 0;
		for (let e = 0; e < 4; e++) {
			let e = a + (c() - .5) * 300, t = o + (c() - .5) * 300;
			i.push({
				cx1: a + (c() - .5) * 300,
				cy1: o + (c() - .5) * 300,
				cx2: a + (c() - .5) * 300,
				cy2: o + (c() - .5) * 300,
				ex: e,
				ey: t
			}), a = e, o = t;
		}
		f.push({
			kind: "squiggle",
			x: n,
			y: r,
			lineWidth: 15,
			color: e,
			curves: i
		});
	}
	s = n + 5e4;
	let p = [], m = 0, h = [];
	for (; m < t;) if (c() < e.voidLikelihood) {
		let t = e.voidWidthMin + c() * (e.voidWidthMax - e.voidWidthMin);
		h.push({
			type: "void",
			x: m,
			width: t
		}), m += t;
	} else {
		let e = 50 + c() * 200;
		h.push({
			type: "matter",
			x: m,
			width: e
		}), m += e;
	}
	for (let n of h) {
		if (n.type !== "matter") continue;
		let r = Math.min(n.x + n.width, t), i = n.x;
		for (; i < r;) {
			let n = (2 + c() * 20) / e.bandDensity, r = Math.floor(c() * t);
			p.push({
				destX: i,
				width: n,
				sourceX: r
			}), i += n;
		}
	}
	return {
		size: t,
		tile: a,
		baseColor: i,
		background: d,
		shapes: f,
		stripes: p,
		transparentVoid: o
	};
}
function x(e, t, n, r) {
	let i = e.size, a = e.tile ? [
		-1,
		0,
		1
	] : [0], o = e.tile ? [
		-1,
		0,
		1
	] : [0];
	n.fillStyle = e.baseColor, n.fillRect(0, 0, i, i);
	let s = n.createLinearGradient(0, 0, 0, i);
	s.addColorStop(0, e.background[0]), s.addColorStop(1, e.background[1]), n.fillStyle = s, n.fillRect(0, 0, i, i);
	for (let t of e.shapes) if (t.kind === "triangle") for (let e of a) for (let r of o) {
		n.fillStyle = t.color, n.beginPath();
		let a = t.x + e * i, o = t.y + r * i;
		n.moveTo(a, o), n.lineTo(a + t.x1, o + t.y1), n.lineTo(a + t.x2, o + t.y2), n.fill();
	}
	else if (t.kind === "circle") for (let e of a) for (let r of o) n.strokeStyle = t.color, n.lineWidth = t.lineWidth, n.beginPath(), n.arc(t.x + e * i, t.y + r * i, t.r, 0, Math.PI * 2), n.stroke();
	else if (t.kind === "bar") for (let e of a) for (let r of o) n.fillStyle = t.color, n.save(), n.translate(t.x + e * i, t.y + r * i), n.rotate(t.rot), n.fillRect(-t.width / 2, -t.height / 2, t.width, t.height), n.restore();
	else {
		n.lineWidth = t.lineWidth, n.lineCap = "round";
		for (let e of a) for (let r of o) {
			n.strokeStyle = t.color, n.beginPath();
			let a = t.x + e * i, o = t.y + r * i;
			n.moveTo(a, o);
			for (let e of t.curves) n.bezierCurveTo(a + e.cx1, o + e.cy1, a + e.cx2, o + e.cy2, a + e.ex, o + e.ey);
			n.stroke();
		}
	}
	e.transparentVoid ? r.clearRect(0, 0, i, i) : (r.fillStyle = e.baseColor, r.fillRect(0, 0, i, i));
	for (let n of e.stripes) r.drawImage(t, n.sourceX, 0, n.width, i, n.destX, 0, n.width, i);
}
//#endregion
//#region src/patternData.ts
var S = 16, C = 256, w = 5, T = 1024, E = 0, D = 1, O = 2;
function k(e) {
	let t = parseInt(e.replace("#", ""), 16);
	return [
		(t >> 16 & 255) / 255,
		(t >> 8 & 255) / 255,
		(t & 255) / 255
	];
}
function A(e, t) {
	let n = k(e.color);
	if (e.kind === "triangle") {
		let r = e.x / t, i = e.y / t, a = (e.x + e.x1) / t, o = (e.y + e.y1) / t, s = (e.x + e.x2) / t, c = (e.y + e.y2) / t, l = (a - r) * (c - i) - (s - r) * (o - i);
		if (Math.abs(l) < 1e-9) return null;
		let u = (r + a + s) / 3, d = (i + o + c) / 3, f = [
			[r, i],
			[a, o],
			[s, c]
		], p = [];
		for (let e = 0; e < 3; e++) {
			let [t, n] = f[e], [r, i] = f[(e + 1) % 3], a = i - n, o = -(r - t), s = Math.hypot(a, o) || 1;
			a /= s, o /= s;
			let c = a * (u - t) + o * (d - n);
			c > 0 && (a = -a, o = -o, c = -c), p.push(a, o, c);
		}
		return {
			type: 0,
			cx: u,
			cy: d,
			bx: Math.max(...f.map((e) => Math.abs(e[0] - u))),
			by: Math.max(...f.map((e) => Math.abs(e[1] - d))),
			color: n,
			geom: p
		};
	}
	if (e.kind === "bar") {
		let r = Math.cos(e.rot), i = Math.sin(e.rot), a = e.width / 2 / t, o = e.height / 2 / t;
		return {
			type: 1,
			cx: e.x / t,
			cy: e.y / t,
			bx: Math.abs(a * r) + Math.abs(o * i),
			by: Math.abs(a * i) + Math.abs(o * r),
			color: n,
			geom: [
				r,
				i,
				a,
				o
			]
		};
	}
	if (e.kind === "circle") {
		let r = e.r / t, i = e.lineWidth / 2 / t;
		return {
			type: 2,
			cx: e.x / t,
			cy: e.y / t,
			bx: r + i,
			by: r + i,
			color: n,
			geom: [r, i]
		};
	}
	return null;
}
function j(e) {
	let t = e.size, n = [], r = 0;
	for (let i of e.shapes) {
		if (i.kind === "squiggle") {
			r++;
			continue;
		}
		let e = A(i, t);
		e && n.push(e);
	}
	let i = Math.max(1, n.length), a = new Float32Array(5 * i * 4);
	n.forEach((e, t) => {
		let n = t * 5 * 4;
		a[n + 0] = e.type, a[n + 1] = e.cx, a[n + 2] = e.cy, a[n + 3] = e.bx, a[n + 4] = e.by, a[n + 5] = e.color[0], a[n + 6] = e.color[1], a[n + 7] = e.color[2];
		for (let t = 0; t < e.geom.length; t++) a[n + 8 + t] = e.geom[t];
	});
	let o = Array.from({ length: 256 }, () => []);
	n.forEach((t, n) => {
		let r = (t.cx - t.bx) * 16, i = (t.cx + t.bx) * 16, a = (t.cy - t.by) * 16, s = (t.cy + t.by) * 16, c = Math.floor(r), l = Math.floor(i), u = Math.floor(a), d = Math.floor(s);
		e.tile ? (l - c >= 15 && (c = 0, l = 15), d - u >= 15 && (u = 0, d = 15)) : (c = Math.max(0, c), l = Math.min(15, l), u = Math.max(0, u), d = Math.min(15, d));
		for (let t = u; t <= d; t++) for (let r = c; r <= l; r++) {
			let i = e.tile ? (r % 16 + 16) % 16 : r, a = e.tile ? (t % 16 + 16) % 16 : t, s = o[a * 16 + i];
			s[s.length - 1] !== n && s.push(n);
		}
	});
	let s = [], c = [];
	for (let e of o) {
		c.push([s.length, e.length]);
		for (let t of e) s.push(t);
	}
	let l = Math.ceil(s.length / 256), u = e.stripes, d = [];
	for (let e of u) {
		let n = Math.min(e.width, t - e.sourceX, t - e.destX);
		n <= 0 || d.push([
			e.destX / t,
			(e.destX + n) / t,
			(e.sourceX - e.destX) / t
		]);
	}
	let f = Math.ceil(d.length / 256), p = T / 256, m = 1 + l, h = m + f, g = Math.max(1, h + p), _ = new Float32Array(256 * g * 4);
	c.forEach(([e, t], n) => {
		let r = n * 4;
		_[r] = e, _[r + 1] = t;
	}), s.forEach((e, t) => {
		let n = (256 + t) * 4;
		_[n] = e;
	}), d.forEach(([e, t, n], r) => {
		let i = (m * 256 + r) * 4;
		_[i] = e, _[i + 1] = t, _[i + 2] = n;
	});
	{
		let e = -1;
		for (let t = 0; t < T; t++) {
			let n = (t + .5) / T;
			for (; e + 1 < d.length && d[e + 1][0] <= n;) e++;
			let r = ((h + Math.floor(t / 256)) * 256 + t % 256) * 4;
			_[r] = e;
		}
	}
	return {
		shapes: a,
		shapeCount: n.length,
		aux: _,
		auxHeight: g,
		itemsRow: 1,
		stripesRow: m,
		stripeCount: d.length,
		stripeLutRow: h,
		gridDim: 16,
		tile: e.tile,
		background0: k(e.background[0]),
		background1: k(e.background[1]),
		baseColor: k(e.baseColor),
		voidAlpha: +!e.transparentVoid,
		droppedSquiggles: r,
		meanCellOccupancy: s.length / 256
	};
}
var M = "#version 300 es\nin vec2 a_pos;\nout vec2 v_uv;\nvoid main() {\n    v_uv = a_pos * 0.5 + 0.5;\n    gl_Position = vec4(a_pos, 0.0, 1.0);\n}\n";
function N() {
	return `#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
out vec4 fragColor;

// ── Analytic procedural pattern (bake) ──
uniform sampler2D u_neat_shapes;
uniform sampler2D u_neat_aux;
uniform float u_neat_grid_dim;
uniform int u_neat_items_row;
uniform int u_neat_stripes_row;
uniform int u_neat_stripe_count;
uniform int u_neat_stripe_lut_row;
uniform float u_neat_tile;
uniform vec3 u_neat_bg0;
uniform vec3 u_neat_bg1;
uniform vec3 u_neat_base;
uniform float u_neat_void_alpha;
uniform float u_neat_edge_softness;
uniform float u_neat_seam_blend;
uniform float u_neat_bake_size;

/** Half the pixel footprint measured along a unit direction g. */
float neatWidth(vec2 g, mat2 J, float soft) {
  return max(0.5 * soft * (abs(dot(g, J[0])) + abs(dot(g, J[1]))), 1e-6);
}

/**
 * Evaluates the shape stack at one point in artwork space.
 *
 * Each shape is filtered along its own surface normal rather than by a single
 * isotropic width, so an edge stays as sharp as the pixel footprint allows in
 * the direction that matters. That is what keeps a ribbon crisp when 3D
 * foreshortening squashes one screen axis far more than the other.
 */
vec3 neatShapesAt(vec2 p, mat2 J, float soft, vec3 bg) {
  vec3 col = bg;

  // A conservative isotropic bound, used only to pad the bounding-box reject.
  float rad = 0.5 * soft * (length(J[0]) + length(J[1]));

  vec2 cellUv = u_neat_tile > 0.5 ? fract(p) : clamp(p, 0.0, 0.999999);
  ivec2 cell = ivec2(floor(cellUv * u_neat_grid_dim));
  int c = cell.y * int(u_neat_grid_dim) + cell.x;
  vec4 rec = texelFetch(u_neat_aux, ivec2(c % 256, c / 256), 0);
  int start = int(rec.x);
  int count = int(rec.y);

  for (int i = 0; i < 256; i++) {
    if (i >= count) break;
    int j = start + i;
    int idx = int(texelFetch(u_neat_aux, ivec2(j % 256, u_neat_items_row + j / 256), 0).x);

    vec4 t0 = texelFetch(u_neat_shapes, ivec2(0, idx), 0);
    vec4 t1 = texelFetch(u_neat_shapes, ivec2(1, idx), 0);

    vec2 d = p - t0.yz;
    if (u_neat_tile > 0.5) d -= floor(d + 0.5);

    // The grid only narrows candidates to a cell; this rejects the ones whose
    // box still misses, before any distance work.
    if (abs(d.x) >= t0.w + rad || abs(d.y) >= t1.x + rad) continue;

    vec4 t2 = texelFetch(u_neat_shapes, ivec2(2, idx), 0);
    float e;
    vec2 g;

    if (t0.x < 0.5) {
      // Triangle: max of three outward half-plane distances. The winning
      // half-plane's normal is the surface normal there.
      vec4 t3 = texelFetch(u_neat_shapes, ivec2(3, idx), 0);
      vec4 t4 = texelFetch(u_neat_shapes, ivec2(4, idx), 0);
      vec2 n0 = t2.xy, n1 = vec2(t2.w, t3.x), n2 = t3.zw;
      float e0 = dot(d, n0) + t2.z;
      float e1 = dot(d, n1) + t3.y;
      float e2 = dot(d, n2) + t4.x;
      e = e0; g = n0;
      if (e1 > e) { e = e1; g = n1; }
      if (e2 > e) { e = e2; g = n2; }
    } else if (t0.x < 1.5) {
      // Bar: rotate into the box's frame, take the box distance, then rotate
      // the local gradient back out.
      vec2 r = vec2(dot(d, t2.xy), dot(d, vec2(-t2.y, t2.x)));
      vec2 b = abs(r) - t2.zw;
      e = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0);
      vec2 gl = b.x > b.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      if (b.x > 0.0 && b.y > 0.0) gl = normalize(max(b, 0.0));
      gl *= sign(r + 1e-20);
      g = gl.x * t2.xy + gl.y * vec2(-t2.y, t2.x);
    } else {
      // Ring: the normal is radial, flipping across the ring's centre line.
      float len = length(d);
      e = abs(len - t2.x) - t2.y;
      g = (d / max(len, 1e-6)) * sign(len - t2.x);
    }

    float w = neatWidth(g, J, soft);
    col = mix(col, t1.yzw, 1.0 - smoothstep(-w, w, e));
  }

  return col;
}

vec4 neatSamplePattern(vec2 uv, mat2 J) {
  vec2 q = fract(uv);

  // The Jacobian is measured on the incoming coordinate, before the stripe
  // remap below. That remap is discontinuous at every seam, and derivatives
  // taken after it would blow up and smear a band across each boundary.
  float soft = u_neat_edge_softness;

  // Stripe boundaries are vertical lines in pattern space, so their normal is
  // x and they get filtered along it — the same anisotropy fix the shapes get.
  float aa = neatWidth(vec2(1.0, 0.0), J, soft);

  float u = q.x;

  // Stripe edges need coverage just as much as shape edges do. A binary
  // inside/outside test leaves every matter/void boundary hard, and because
  // those boundaries are vertical in pattern space they land as long diagonals
  // on screen once the ribbon is warped — the most visible aliasing there is.
  // Bitmap mode gets this for free from bilinear filtering.
  //
  // Coverages are summed rather than maxed: stripes within a matter segment are
  // contiguous, so the two halves either side of a seam must add to 1, or the
  // seam darkens into a visible line.
  //
  // Not an early-out loop: a matter segment's last stripe can overshoot into
  // the next one, and the bitmap path resolves the overlap by draw order, so
  // the last match has to win.
  //
  // Two stripes are considered, not one. Where a pixel straddles a seam the
  // artwork lookup jumps discontinuously — the two sides come from different
  // columns of the source — so no amount of coverage on a single lookup can
  // smooth it. Both sides get evaluated and blended instead. This is the
  // dominant source of aliasing when baking: seams are vertical in pattern
  // space, so they land as long diagonals on screen. Bitmap mode hides the same
  // discontinuity under bilinear filtering.
  //
  // The lookup table names the only two candidates, so this is three fetches
  // rather than a scan over every stripe.
  int li = int(clamp(u, 0.0, 0.999999) * float(${T}));
  int iA = int(texelFetch(u_neat_aux,
    ivec2(li % 256, u_neat_stripe_lut_row + li / 256), 0).x);
  // Three candidates, not two. The table names the last stripe *starting* at or
  // before u, so immediately past a seam that is the stripe on the right — and
  // the one on the left, whose coverage makes up the other half of the pixel,
  // is its predecessor. Considering only iA and iA+1 drops it, coverage falls to
  // a half, and the fragment blends halfway to the void colour: a dark hairline
  // down every seam.
  //
  // Coverages sum rather than max: stripes in a matter segment are contiguous,
  // and smoothstep is symmetric about its midpoint, so the two halves either
  // side of a seam add to exactly 1.
  float cov = 0.0;
  float c1 = -1.0, c2 = -1.0;
  float su1 = u, su2 = u;

  for (int k = -1; k <= 1; k++) {
    int idx = iA + k;
    if (idx < 0 || idx >= u_neat_stripe_count) continue;
    vec4 st = texelFetch(u_neat_aux,
      ivec2(idx % 256, u_neat_stripes_row + idx / 256), 0);
    float c = min(smoothstep(-aa, aa, u - st.x), smoothstep(-aa, aa, st.y - u));
    cov += c;
    // >= so a tie goes to the later stripe, matching the bitmap's draw order,
    // which is also what keeps an overshooting stripe overlapping correctly.
    if (c >= c1) { c2 = c1; su2 = su1; c1 = c; su1 = u + st.z; }
    else if (c > c2) { c2 = c; su2 = u + st.z; }
  }
  cov = clamp(cov, 0.0, 1.0);

  if (cov <= 0.0) return vec4(u_neat_base, u_neat_void_alpha);

  vec2 p = vec2(su1, q.y);
  vec3 bg = mix(u_neat_bg0, u_neat_bg1, q.y);
  vec3 col = neatShapesAt(p, J, soft, bg);

  // Blend in the far side of a seam by whatever fraction of the pixel the near
  // stripe leaves uncovered. When the near stripe covers the pixel outright the
  // weight is zero, which also keeps overlapping stripes last-wins rather than
  // ghosting them together.
  float w2 = min(max(c2, 0.0), clamp(1.0 - c1, 0.0, 1.0)) * u_neat_seam_blend;
  if (w2 > 0.001) {
    col = mix(col, neatShapesAt(vec2(su2, q.y), J, soft, bg), w2);
  }

  return vec4(mix(u_neat_base, col, cov), mix(u_neat_void_alpha, 1.0, cov));
}

void main() {
  // One output texel is exactly one unit of pattern space over the bake size,
  // and the axes are independent — so the footprint is known exactly here and
  // needs no screen-space derivatives.
  float t = 1.0 / u_neat_bake_size;
  fragColor = neatSamplePattern(v_uv, mat2(vec2(t, 0.0), vec2(0.0, t)));
}
`;
}
//#endregion
//#region src/NeatGradient.ts
function P() {
	console.info(`%c🌈 Neat Gradients v${_}%c\n\nLicensed under MIT + The Commons Clause.\nFree for personal and commercial use.\nSelling this software or its derivatives is strictly prohibited.\nGet a license key to remove the watermark and this message: https://neat.firecms.co`, "font-weight: bold; font-size: 14px; color: #FF5772;", "color: inherit;");
}
var F = 50, I = 80, L = 6, R = [
	"position",
	"normal",
	"uv"
], z = [
	[
		"speed",
		"_speed",
		20,
		1 / 20,
		"u"
	],
	[
		"horizontalPressure",
		"_horizontalPressure",
		4,
		1 / 4,
		"u"
	],
	[
		"verticalPressure",
		"_verticalPressure",
		4,
		1 / 4,
		"u"
	],
	[
		"waveFrequencyX",
		"_waveFrequencyX",
		25,
		.04,
		"u"
	],
	[
		"waveFrequencyY",
		"_waveFrequencyY",
		25,
		.04,
		"u"
	],
	[
		"waveAmplitude",
		"_waveAmplitude",
		1 / .75,
		.75,
		"u"
	],
	[
		"secondaryWaveFrequencyX",
		"_secondaryWaveFrequencyX",
		25,
		.04,
		"u"
	],
	[
		"secondaryWaveFrequencyY",
		"_secondaryWaveFrequencyY",
		25,
		.04,
		"u"
	],
	[
		"secondaryWaveAmplitude",
		"_secondaryWaveAmplitude",
		10,
		1 / 10,
		"u"
	],
	[
		"highlights",
		"_highlights",
		100,
		1 / 100,
		"u"
	],
	[
		"shadows",
		"_shadows",
		100,
		1 / 100,
		"u"
	],
	[
		"colorSaturation",
		"_saturation",
		10,
		1 / 10,
		"u"
	],
	[
		"colorBlending",
		"_colorBlending",
		10,
		1 / 10,
		"u"
	],
	[
		"yOffsetWaveMultiplier",
		"_yOffsetWaveMultiplier",
		1e3,
		1 / 1e3,
		"u"
	],
	[
		"yOffsetColorMultiplier",
		"_yOffsetColorMultiplier",
		1e3,
		1 / 1e3,
		"u"
	],
	[
		"yOffsetFlowMultiplier",
		"_yOffsetFlowMultiplier",
		1e3,
		1 / 1e3,
		"u"
	],
	[
		"colorBrightness",
		"_brightness",
		1,
		1,
		"u"
	],
	[
		"grainIntensity",
		"_grainIntensity",
		1,
		1,
		"u"
	],
	[
		"grainSparsity",
		"_grainSparsity",
		1,
		1,
		"u"
	],
	[
		"grainSpeed",
		"_grainSpeed",
		1,
		1,
		"u"
	],
	[
		"wireframe",
		"_wireframe",
		1,
		1,
		"u"
	],
	[
		"backgroundAlpha",
		"_backgroundAlpha",
		1,
		1,
		"u"
	],
	[
		"flowDistortionA",
		"_flowDistortionA",
		1,
		1,
		"u"
	],
	[
		"flowDistortionB",
		"_flowDistortionB",
		1,
		1,
		"u"
	],
	[
		"flowScale",
		"_flowScale",
		1,
		1,
		"u"
	],
	[
		"flowEase",
		"_flowEase",
		1,
		1,
		"u"
	],
	[
		"flowEnabled",
		"_flowEnabled",
		1,
		1,
		"u"
	],
	[
		"textureEase",
		"_textureEase",
		1,
		1,
		"u"
	],
	[
		"silhouetteFade",
		"_silhouetteFade",
		1,
		1,
		"u"
	],
	[
		"cylinderFade",
		"_cylinderFade",
		1,
		1,
		"u"
	],
	[
		"ribbonFade",
		"_ribbonFade",
		1,
		1,
		"u"
	],
	[
		"flatShading",
		"_flatShading",
		1,
		1,
		"u"
	],
	[
		"domainWarpEnabled",
		"_domainWarpEnabled",
		1,
		1,
		"u"
	],
	[
		"domainWarpIntensity",
		"_domainWarpIntensity",
		1,
		1,
		"u"
	],
	[
		"domainWarpScale",
		"_domainWarpScale",
		1,
		1,
		"u"
	],
	[
		"vignetteIntensity",
		"_vignetteIntensity",
		1,
		1,
		"u"
	],
	[
		"vignetteRadius",
		"_vignetteRadius",
		1,
		1,
		"u"
	],
	[
		"fresnelEnabled",
		"_fresnelEnabled",
		1,
		1,
		"u"
	],
	[
		"fresnelPower",
		"_fresnelPower",
		1,
		1,
		"u"
	],
	[
		"fresnelIntensity",
		"_fresnelIntensity",
		1,
		1,
		"u"
	],
	[
		"iridescenceEnabled",
		"_iridescenceEnabled",
		1,
		1,
		"u"
	],
	[
		"iridescenceIntensity",
		"_iridescenceIntensity",
		1,
		1,
		"u"
	],
	[
		"iridescenceSpeed",
		"_iridescenceSpeed",
		1,
		1,
		"u"
	],
	[
		"secondaryWaveEnabled",
		"_secondaryWaveEnabled",
		1,
		1,
		"u"
	],
	[
		"secondaryWaveSpeed",
		"_secondaryWaveSpeed",
		1,
		1,
		"u"
	],
	[
		"secondaryWaveAngle",
		"_secondaryWaveAngle",
		1,
		1,
		"u"
	],
	[
		"prismEdgeEnabled",
		"_prismEdgeEnabled",
		1,
		1,
		"u"
	],
	[
		"prismEdgeIntensity",
		"_prismEdgeIntensity",
		1,
		1,
		"u"
	],
	[
		"prismEdgeThinness",
		"_prismEdgeThinness",
		1,
		1,
		"u"
	],
	[
		"prismEdgeSpread",
		"_prismEdgeSpread",
		1,
		1,
		"u"
	],
	[
		"prismEdgeSpeed",
		"_prismEdgeSpeed",
		1,
		1,
		"u"
	],
	[
		"prismEdgeRipple",
		"_prismEdgeRipple",
		1,
		1,
		"u"
	],
	[
		"bloomIntensity",
		"_bloomIntensity",
		1,
		1,
		"u"
	],
	[
		"bloomThreshold",
		"_bloomThreshold",
		1,
		1,
		"u"
	],
	[
		"chromaticAberration",
		"_chromaticAberration",
		1,
		1,
		"u"
	],
	[
		"shapeRotationX",
		"_shapeRotationX",
		1,
		1,
		"u"
	],
	[
		"shapeRotationY",
		"_shapeRotationY",
		1,
		1,
		"u"
	],
	[
		"shapeRotationZ",
		"_shapeRotationZ",
		1,
		1,
		"u"
	],
	[
		"shapeAutoRotateSpeedX",
		"_shapeAutoRotateSpeedX",
		1,
		1,
		"u"
	],
	[
		"shapeAutoRotateSpeedY",
		"_shapeAutoRotateSpeedY",
		1,
		1,
		"u"
	],
	[
		"cameraX",
		"_cameraX",
		1,
		1,
		"u"
	],
	[
		"cameraY",
		"_cameraY",
		1,
		1,
		"u"
	],
	[
		"cameraZ",
		"_cameraZ",
		1,
		1,
		"u"
	],
	[
		"cameraRotationX",
		"_cameraRotationX",
		1,
		1,
		"u"
	],
	[
		"cameraRotationY",
		"_cameraRotationY",
		1,
		1,
		"u"
	],
	[
		"cameraRotationZ",
		"_cameraRotationZ",
		1,
		1,
		"u"
	],
	[
		"textureVoidLikelihood",
		"_textureVoidLikelihood",
		1,
		1,
		"t"
	],
	[
		"textureVoidWidthMin",
		"_textureVoidWidthMin",
		1,
		1,
		"t"
	],
	[
		"textureVoidWidthMax",
		"_textureVoidWidthMax",
		1,
		1,
		"t"
	],
	[
		"textureBandDensity",
		"_textureBandDensity",
		1,
		1,
		"t"
	],
	[
		"textureColorBlending",
		"_textureColorBlending",
		1,
		1,
		"t"
	],
	[
		"textureSeed",
		"_textureSeed",
		1,
		1,
		"t"
	],
	[
		"transparentTextureVoid",
		"_transparentTextureVoid",
		1,
		1,
		"t"
	],
	[
		"proceduralBackgroundColor",
		"_proceduralBackgroundColor",
		1,
		1,
		"t"
	],
	[
		"textureShapeTriangles",
		"_textureShapeTriangles",
		1,
		1,
		"t"
	],
	[
		"textureShapeCircles",
		"_textureShapeCircles",
		1,
		1,
		"t"
	],
	[
		"textureShapeBars",
		"_textureShapeBars",
		1,
		1,
		"t"
	],
	[
		"textureShapeSquiggles",
		"_textureShapeSquiggles",
		1,
		1,
		"t"
	],
	[
		"sphereRadius",
		"_sphereRadius",
		1,
		1,
		"g"
	],
	[
		"torusRadius",
		"_torusRadius",
		1,
		1,
		"g"
	],
	[
		"torusTube",
		"_torusTube",
		1,
		1,
		"g"
	],
	[
		"cylinderRadius",
		"_cylinderRadius",
		1,
		1,
		"g"
	],
	[
		"cylinderHeight",
		"_cylinderHeight",
		1,
		1,
		"g"
	],
	[
		"planeBend",
		"_planeBend",
		1,
		1,
		"g"
	],
	[
		"planeTwist",
		"_planeTwist",
		1,
		1,
		"g"
	]
], B = class {
	_ref;
	_licensed = !1;
	_antialias = !1;
	_speed = -1;
	_horizontalPressure = -1;
	_verticalPressure = -1;
	_waveFrequencyX = -1;
	_waveFrequencyY = -1;
	_waveAmplitude = -1;
	_secondaryWaveEnabled = !1;
	_secondaryWaveFrequencyX = .12;
	_secondaryWaveFrequencyY = .12;
	_secondaryWaveAmplitude = .5;
	_secondaryWaveSpeed = .6;
	_secondaryWaveAngle = 1;
	_shadows = -1;
	_highlights = -1;
	_saturation = -1;
	_brightness = -1;
	_grainScale = -1;
	_grainIntensity = -1;
	_grainSparsity = -1;
	_grainSpeed = -1;
	_colorBlending = -1;
	_resolution = 1;
	_colors = [];
	_wireframe = !1;
	_backgroundColor = "#FFFFFF";
	_backgroundColorRgb = [
		1,
		1,
		1
	];
	_backgroundAlpha = 1;
	_flowDistortionA = 0;
	_flowDistortionB = 0;
	_flowScale = 1;
	_flowEase = 0;
	_flowEnabled = !0;
	glState;
	_enableProceduralTexture = !1;
	_textureVoidLikelihood = .45;
	_textureVoidWidthMin = 200;
	_textureVoidWidthMax = 486;
	_textureBandDensity = 2.15;
	_textureColorBlending = .01;
	_textureSeed = 333;
	_textureEase = .5;
	_transparentTextureVoid = !1;
	_domainWarpEnabled = !1;
	_domainWarpIntensity = .5;
	_domainWarpScale = 1;
	_vignetteIntensity = .5;
	_vignetteRadius = .8;
	_fresnelEnabled = !1;
	_fresnelPower = 2;
	_fresnelIntensity = .5;
	_fresnelColor = "#FFFFFF";
	_fresnelColorRgb = [
		1,
		1,
		1
	];
	_iridescenceEnabled = !1;
	_iridescenceIntensity = .5;
	_iridescenceSpeed = 1;
	_prismEdgeEnabled = !1;
	_prismEdgeIntensity = .5;
	_prismEdgeThinness = 3;
	_prismEdgeSpread = 1;
	_prismEdgeSpeed = .5;
	_prismEdgeRipple = 1;
	_bloomIntensity = 0;
	_bloomThreshold = .7;
	_chromaticAberration = 0;
	_silhouetteFade = .25;
	_cylinderFade = .08;
	_ribbonFade = .05;
	_flatShading = !0;
	_shapeType = "plane";
	_shapeRotationX = 0;
	_shapeRotationY = 0;
	_shapeRotationZ = 0;
	_shapeAutoRotateSpeedX = 0;
	_shapeAutoRotateSpeedY = 0;
	_sphereRadius = 15;
	_torusRadius = 15;
	_torusTube = 5;
	_cylinderRadius = 10;
	_cylinderHeight = 40;
	_planeBend = 0;
	_planeTwist = 0;
	_cameraLock = !1;
	_cameraX = 0;
	_cameraY = 0;
	_cameraZ = 0;
	_cameraRotationX = 0;
	_cameraRotationY = 0;
	_cameraRotationZ = 0;
	_cameraZoom = 1;
	_proceduralTexture = null;
	_proceduralBackgroundColor = "#000000";
	_textureMode = "bitmap";
	_activeTextureMode = "bitmap";
	_isWebGL2 = !1;
	_derivativesSupported = !1;
	_bakeWarned = !1;
	_bakeEdgeSoftness = 1;
	_bakeSeamBlend = !0;
	_textureBakeResolution = 0;
	_shapeTexture = null;
	_auxTexture = null;
	_bakeProgram = null;
	_bakeQuad = null;
	_bakeFbo = null;
	_bakeVao = null;
	_bakeUniforms = {};
	_textureShapeTriangles = 20;
	_textureShapeCircles = 15;
	_textureShapeBars = 15;
	_textureShapeSquiggles = 10;
	requestRef = -1;
	sizeObserver;
	_currentCursor = "";
	_initialized = !1;
	_destroyed = !1;
	_parallelCompile = null;
	_pendingGradient = null;
	_pendingBake = null;
	_cachedColorRgb = [];
	_yOffset = 0;
	_yOffsetWaveMultiplier = .004;
	_yOffsetColorMultiplier = .004;
	_yOffsetFlowMultiplier = .004;
	_sourceCanvas = null;
	_sourceCtx = null;
	_maskedCanvas = null;
	_maskedCtx = null;
	_resizeTimeoutId = null;
	_colorsChanged = !0;
	_textureDirty = !0;
	_modelViewMatrix = new i();
	_isVisible = !0;
	__uniformsDirty = !0;
	__yOffsetDirty = !1;
	__textureNeedsUpdate = !1;
	_parked = !1;
	_renderFrame = null;
	get _uniformsDirty() {
		return this.__uniformsDirty;
	}
	set _uniformsDirty(e) {
		this.__uniformsDirty = e, e && this._wake();
	}
	get _yOffsetDirty() {
		return this.__yOffsetDirty;
	}
	set _yOffsetDirty(e) {
		this.__yOffsetDirty = e, e && this._wake();
	}
	get _textureNeedsUpdate() {
		return this.__textureNeedsUpdate;
	}
	set _textureNeedsUpdate(e) {
		this.__textureNeedsUpdate = e, e && this._wake();
	}
	_segmentsInUse = 0;
	_shaderKey = "";
	_renderScale = 1;
	_cssWidth = 0;
	_cssHeight = 0;
	_applySize = null;
	get _meshBase() {
		return this._shapeType === "plane" || this._shapeType === "ribbon" ? 240 : 120;
	}
	_segmentsFor(e, t, n) {
		let r = this._resolution || 1, i = Math.round(e * r), a = Math.max(t, n);
		return a ? Math.min(i, Math.max(24, Math.round(a / 6 * r))) : i;
	}
	_wake() {
		!this._parked || !this._isVisible || !this._renderFrame || (this._parked = !1, this.requestRef = requestAnimationFrame(this._renderFrame));
	}
	_visibilityObserver = null;
	_visibilityHandler = null;
	_watermarkProgram = null;
	_watermarkTexture = null;
	_watermarkBuffer = null;
	_watermarkTexCoordBuffer = null;
	_watermarkWidth = 0;
	_watermarkHeight = 0;
	_watermarkMargin = 4;
	_wmLocPos = -1;
	_wmLocTc = -1;
	_wmLocTex = null;
	_wmLinked = !1;
	_wmPosData = /* @__PURE__ */ new Float32Array(8);
	_wmClickHandler = null;
	_wmMoveHandler = null;
	_wmMoveRafPending = !1;
	_wmCachedRect = null;
	_wmRectCacheTime = 0;
	_gradientVAO = null;
	_watermarkVAO = null;
	constructor(e) {
		let { ref: t, speed: n = 4, horizontalPressure: r = 3, verticalPressure: i = 3, waveFrequencyX: a = 5, waveFrequencyY: s = 5, waveAmplitude: c = 3, secondaryWaveEnabled: l = !1, secondaryWaveFrequencyX: u = 3, secondaryWaveFrequencyY: d = 3, secondaryWaveAmplitude: f = 5, secondaryWaveSpeed: p = .6, secondaryWaveAngle: m = 1, colors: h, highlights: _ = 4, shadows: v = 4, colorSaturation: y = 0, colorBrightness: b = 1, colorBlending: x = 5, grainScale: S = 2, grainIntensity: C = .55, grainSparsity: w = 0, grainSpeed: T = .1, wireframe: E = !1, backgroundColor: D = "#FFFFFF", backgroundAlpha: O = 1, resolution: k = 1, seed: A, yOffset: j = 0, yOffsetWaveMultiplier: M = 4, yOffsetColorMultiplier: N = 4, yOffsetFlowMultiplier: R = 4, flowDistortionA: z = 0, flowDistortionB: B = 0, flowScale: V = 1, flowEase: H = 0, flowEnabled: ne = !0, enableProceduralTexture: re = !1, textureMode: ie = "bitmap", textureBakeResolution: ae = 0, bakeEdgeSoftness: oe = 1, textureVoidLikelihood: U = .45, textureVoidWidthMin: W = 200, textureVoidWidthMax: G = 486, textureBandDensity: K = 2.15, textureColorBlending: q = .01, textureSeed: se = 333, textureEase: ce = .5, proceduralBackgroundColor: le = "#000000", transparentTextureVoid: ue = !1, textureShapeTriangles: de = 20, textureShapeCircles: fe = 15, textureShapeBars: pe = 15, textureShapeSquiggles: me = 10, domainWarpEnabled: he = !1, domainWarpIntensity: ge = .5, domainWarpScale: _e = 1, vignetteIntensity: ve = 0, vignetteRadius: ye = .8, fresnelEnabled: be = !1, fresnelPower: xe = 2, fresnelIntensity: Se = .5, fresnelColor: Ce = "#FFFFFF", iridescenceEnabled: we = !1, iridescenceIntensity: Te = .5, iridescenceSpeed: Ee = 1, prismEdgeEnabled: De = !1, prismEdgeIntensity: Oe = .5, prismEdgeThinness: ke = 3, prismEdgeSpread: Ae = 1, prismEdgeSpeed: je = .5, prismEdgeRipple: Me = 1, bloomIntensity: Ne = 0, bloomThreshold: Pe = .7, chromaticAberration: Fe = 0, silhouetteFade: Ie = .25, cylinderFade: Le = .08, ribbonFade: Re = .05, flatShading: ze = !0, cameraLock: Be = !1, cameraX: Ve = 0, cameraY: He = 0, cameraZ: Ue = 0, cameraRotationX: We = 0, cameraRotationY: Ge = 0, cameraRotationZ: Ke = 0, cameraZoom: qe = 1, shapeType: Je = "plane", shapeRotationX: Ye = 0, shapeRotationY: Xe = 0, shapeRotationZ: Ze = 0, shapeAutoRotateSpeedX: Qe = 0, shapeAutoRotateSpeedY: $e = 0, sphereRadius: J = 15, torusRadius: et = 15, torusTube: tt = 5, cylinderRadius: nt = 10, cylinderHeight: rt = 40, planeBend: it = 0, planeTwist: at = 0, licenseKey: Y, preserveDrawingBuffer: ot = !1, antialias: st = !1, renderScale: ct = 1 } = e;
		this._ref = t, this._antialias = st, this._renderScale = Math.min(Math.max(ct, .1), 3), this.destroy = this.destroy.bind(this), this._initScene = this._initScene.bind(this), this.speed = n, this.horizontalPressure = r, this.verticalPressure = i, this.waveFrequencyX = a, this.waveFrequencyY = s, this.waveAmplitude = c, this.secondaryWaveEnabled = l, this.secondaryWaveFrequencyX = u, this.secondaryWaveFrequencyY = d, this.secondaryWaveAmplitude = f, this.secondaryWaveSpeed = p, this.secondaryWaveAngle = m, this.colorBlending = x, this._resolution = k, this.grainScale = S, this.grainIntensity = C, this.grainSparsity = w, this.grainSpeed = T, this.colors = h, this.shadows = v, this.highlights = _, this.colorSaturation = y, this.colorBrightness = b, this.wireframe = E, this.backgroundColor = D, this.backgroundAlpha = O, this.yOffset = j, this.yOffsetWaveMultiplier = M, this.yOffsetColorMultiplier = N, this.yOffsetFlowMultiplier = R, this.flowDistortionA = z, this.flowDistortionB = B, this.flowScale = V, this.flowEase = H, this.flowEnabled = ne, this._textureMode = ie === "baked" ? "baked" : "bitmap", this._textureBakeResolution = ae, this._bakeEdgeSoftness = oe, this.enableProceduralTexture = re, this.textureVoidLikelihood = U, this.textureVoidWidthMin = W, this.textureVoidWidthMax = G, this.textureBandDensity = K, this.textureColorBlending = q, this.textureSeed = se, this.textureEase = ce, this._proceduralBackgroundColor = le, this.transparentTextureVoid = ue, this._textureShapeTriangles = de, this._textureShapeCircles = fe, this._textureShapeBars = pe, this._textureShapeSquiggles = me, this.domainWarpEnabled = he, this.domainWarpIntensity = ge, this.domainWarpScale = _e, this.vignetteIntensity = ve, this.vignetteRadius = ye, this.fresnelEnabled = be, this.fresnelPower = xe, this.fresnelIntensity = Se, this.fresnelColor = Ce, this.iridescenceEnabled = we, this.iridescenceIntensity = Te, this.iridescenceSpeed = Ee, this.prismEdgeEnabled = De, this.prismEdgeIntensity = Oe, this.prismEdgeThinness = ke, this.prismEdgeSpread = Ae, this.prismEdgeSpeed = je, this.prismEdgeRipple = Me, this.bloomIntensity = Ne, this.bloomThreshold = Pe, this.chromaticAberration = Fe, this.silhouetteFade = Ie, this.cylinderFade = Le, this.ribbonFade = Re, this._flatShading = ze, this._cameraLock = Be, this._cameraX = Ve, this._cameraY = He, this._cameraZ = Ue, this._cameraRotationX = We, this._cameraRotationY = Ge, this._cameraRotationZ = Ke, this._cameraZoom = qe, this._shapeType = Je, this._shapeRotationX = Ye, this._shapeRotationY = Xe, this._shapeRotationZ = Ze, this._shapeAutoRotateSpeedX = Qe, this._shapeAutoRotateSpeedY = $e, this._sphereRadius = J, this._torusRadius = et, this._torusTube = tt, this._cylinderRadius = nt, this._cylinderHeight = rt, this._planeBend = it, this._planeTwist = at, this.glState = this._initScene(k, ot), this._enableProceduralTexture && this._resolveTextureMode() === "baked" && this._startBakeProgram(this.glState.gl), te(), Y ? g(Y).then((e) => {
			this._destroyed || (this._licensed = e.valid, e.valid || (this._startWatermark(), this._wake(), console.warn(`NEAT license key error: ${e.reason}`), P()));
		}) : (this._startWatermark(), P());
		let X = A === void 0 ? ee() : A, Z = performance.now(), Q = () => {
			if (!this._initialized) {
				if (!this._completeStartup()) {
					cancelAnimationFrame(this.requestRef), this.requestRef = this._isVisible ? requestAnimationFrame(Q) : -1;
					return;
				}
				Z = performance.now();
			}
			let e = !1;
			if (this.__uniformsDirty && this._shaderKey !== this._shaderFeatureKey() && this._rebuildProgram(), this._pendingGradient) {
				let t = this._pendingGradient;
				if (this._linked(this.glState.gl, t.program)) {
					let e = this.glState.program;
					this._pendingGradient = null, this._wireProgram(this.glState.gl, t), this.glState.gl.deleteProgram(e);
				} else e = !0;
			}
			let { gl: t, program: n, locations: r, indexCount: i, indexType: a } = this.glState;
			if (this._initialized) {
				let i = performance.now();
				X += (i - Z) / 1e3 * this._speed, Z = i, t.useProgram(n), t.uniform1f(r.uniforms.u_time, X);
				{
					let e = this.glState.camera, n = this._modelViewMatrix;
					n.identity(), n.translate(-e.position[0] - this._cameraX, -e.position[1] - this._cameraY, -e.position[2] - this._cameraZ), n.translate(0, 0, -1), n.rotateX(-this._cameraRotationX), n.rotateY(-this._cameraRotationY), n.rotateZ(-this._cameraRotationZ);
					let i = this._shapeRotationX, a = this._shapeRotationY, o = this._shapeRotationZ;
					this._shapeAutoRotateSpeedX !== 0 && (i += X * this._shapeAutoRotateSpeedX * .1), this._shapeAutoRotateSpeedY !== 0 && (a += X * this._shapeAutoRotateSpeedY * .1), this._shapeType === "plane" || this._shapeType === "ribbon" ? n.rotateX(i - Math.PI / 3.5) : n.rotateX(i), n.rotateY(a), n.rotateZ(o);
					let s = r.uniforms.modelViewMatrix;
					s && t.uniformMatrix4fv(s, !1, n.elements);
				}
				if (this._yOffsetDirty && !this._uniformsDirty && (t.uniform1f(r.uniforms.u_y_offset, this._yOffset), this._yOffsetDirty = !1), this._uniformsDirty) {
					t.uniform2f(r.uniforms.u_resolution, this._ref.width, this._ref.height), t.uniform2f(r.uniforms.u_color_pressure, this._horizontalPressure, this._verticalPressure), t.uniform1f(r.uniforms.u_wave_frequency_x, this._waveFrequencyX), t.uniform1f(r.uniforms.u_wave_frequency_y, this._waveFrequencyY), t.uniform1f(r.uniforms.u_wave_amplitude, this._waveAmplitude), t.uniform1f(r.uniforms.u_wave2_frequency_x, this._secondaryWaveFrequencyX), t.uniform1f(r.uniforms.u_wave2_frequency_y, this._secondaryWaveFrequencyY), t.uniform1f(r.uniforms.u_wave2_amplitude, this._secondaryWaveAmplitude), t.uniform1f(r.uniforms.u_wave2_speed, this._secondaryWaveSpeed), t.uniform1f(r.uniforms.u_wave2_angle, this._secondaryWaveAngle), t.uniform1f(r.uniforms.u_color_blending, this._colorBlending), t.uniform1f(r.uniforms.u_shadows, this._shadows), t.uniform1f(r.uniforms.u_highlights, this._highlights), t.uniform1f(r.uniforms.u_saturation, this._saturation), t.uniform1f(r.uniforms.u_brightness, this._brightness), t.uniform1f(r.uniforms.u_grain_intensity, this._grainIntensity), t.uniform1f(r.uniforms.u_grain_sparsity, this._grainSparsity), t.uniform1f(r.uniforms.u_grain_speed, this._grainSpeed), t.uniform1f(r.uniforms.u_grain_scale, this._grainScale), t.uniform1f(r.uniforms.u_y_offset, this._yOffset), t.uniform1f(r.uniforms.u_y_offset_wave_multiplier, this._yOffsetWaveMultiplier), t.uniform1f(r.uniforms.u_y_offset_color_multiplier, this._yOffsetColorMultiplier), t.uniform1f(r.uniforms.u_y_offset_flow_multiplier, this._yOffsetFlowMultiplier), t.uniform1f(r.uniforms.u_flow_distortion_a, this._flowDistortionA), t.uniform1f(r.uniforms.u_flow_distortion_b, this._flowDistortionB), t.uniform1f(r.uniforms.u_flow_scale, this._flowScale), t.uniform1f(r.uniforms.u_flow_ease, this._flowEase), t.uniform1f(r.uniforms.u_flow_enabled, +!!this._flowEnabled);
					let e = 0;
					this._shapeType === "sphere" ? e = 1 : this._shapeType === "torus" ? e = 2 : this._shapeType === "cylinder" ? e = 3 : this._shapeType === "ribbon" && (e = 4), t.uniform1f(r.uniforms.u_shape_type, e), t.uniform1f(r.uniforms.u_enable_procedural_texture, +!!this._enableProceduralTexture), t.uniform1f(r.uniforms.u_texture_ease, this._textureEase), t.uniform1f(r.uniforms.u_transparent_texture_void, +!!this._transparentTextureVoid), t.uniform1f(r.uniforms.u_domain_warp_enabled, +!!this._domainWarpEnabled), t.uniform1f(r.uniforms.u_domain_warp_intensity, this._domainWarpIntensity), t.uniform1f(r.uniforms.u_domain_warp_scale, this._domainWarpScale), t.uniform1f(r.uniforms.u_vignette_intensity, this._vignetteIntensity), t.uniform1f(r.uniforms.u_vignette_radius, this._vignetteRadius), t.uniform1f(r.uniforms.u_fresnel_enabled, +!!this._fresnelEnabled), t.uniform1f(r.uniforms.u_fresnel_power, this._fresnelPower), t.uniform1f(r.uniforms.u_fresnel_intensity, this._fresnelIntensity), t.uniform3fv(r.uniforms.u_fresnel_color, this._fresnelColorRgb), t.uniform1f(r.uniforms.u_iridescence_enabled, +!!this._iridescenceEnabled), t.uniform1f(r.uniforms.u_iridescence_intensity, this._iridescenceIntensity), t.uniform1f(r.uniforms.u_iridescence_speed, this._iridescenceSpeed), t.uniform1f(r.uniforms.u_prism_edge_intensity, this._prismEdgeIntensity), t.uniform1f(r.uniforms.u_prism_edge_thinness, this._prismEdgeThinness), t.uniform1f(r.uniforms.u_prism_edge_spread, this._prismEdgeSpread), t.uniform1f(r.uniforms.u_prism_edge_speed, this._prismEdgeSpeed), t.uniform1f(r.uniforms.u_prism_edge_ripple, this._prismEdgeRipple), t.uniform1f(r.uniforms.u_bloom_intensity, this._bloomIntensity), t.uniform1f(r.uniforms.u_bloom_threshold, this._bloomThreshold), t.uniform1f(r.uniforms.u_chromatic_aberration, this._chromaticAberration), t.uniform1f(r.uniforms.u_silhouette_fade, this._silhouetteFade), t.uniform1f(r.uniforms.u_cylinder_fade, this._cylinderFade), t.uniform1f(r.uniforms.u_ribbon_fade, this._ribbonFade), t.uniform1f(r.uniforms.u_flat_shading, +!!this._flatShading), this._uniformsDirty = !1, this._yOffsetDirty = !1;
				}
				if (this._textureNeedsUpdate && this._enableProceduralTexture && (this._bakeProgramLinking(t) ? e = !0 : (this._proceduralTexture && t.deleteTexture(this._proceduralTexture), this._proceduralTexture = this._createProceduralTexture(t), this._textureNeedsUpdate = !1, this._textureDirty = !0)), this._textureDirty && this._proceduralTexture && (t.activeTexture(t.TEXTURE1), t.bindTexture(t.TEXTURE_2D, this._proceduralTexture), t.uniform1i(r.uniforms.u_procedural_texture, 1), this._textureDirty = !1), this._colorsChanged) {
					this._colorsChanged = !1;
					for (let e = 0; e < L; e++) if (e < this._colors.length) {
						let n = this._colors[e], i = this._cachedColorRgb[e] || [
							0,
							0,
							0
						];
						t.uniform1f(r.uniforms[`u_colors[${e}].is_active`], +!!n.enabled), t.uniform3fv(r.uniforms[`u_colors[${e}].color`], i), t.uniform1f(r.uniforms[`u_colors[${e}].influence`], n.influence ?? 1);
					} else t.uniform1f(r.uniforms[`u_colors[${e}].is_active`], 0);
					t.uniform1i(r.uniforms.u_colors_count, L);
				}
			}
			if (t.clearColor(this._backgroundColorRgb[0], this._backgroundColorRgb[1], this._backgroundColorRgb[2], this._backgroundAlpha), t.clear(t.COLOR_BUFFER_BIT | t.DEPTH_BUFFER_BIT), this._wireframe ? (t.bindBuffer(t.ELEMENT_ARRAY_BUFFER, this.glState.buffers.wireframeIndex), t.drawElements(t.LINES, this.glState.wireframeIndexCount, a, 0), t.bindBuffer(t.ELEMENT_ARRAY_BUFFER, this.glState.buffers.index)) : t.drawElements(t.TRIANGLES, i, a, 0), !this._licensed && !this._renderWatermark(t) && (e = !0), !this._isVisible) {
				this._parked = !1, this.requestRef = -1;
				return;
			}
			if (this._speed === 0 && !e) {
				this._parked = !0, this.requestRef = -1;
				return;
			}
			this.requestRef = requestAnimationFrame(Q);
		};
		this._renderFrame = Q, this._visibilityObserver = new IntersectionObserver((e) => {
			let t = this._isVisible;
			this._isVisible = e[0].isIntersecting && document.visibilityState !== "hidden", this._isVisible && !t && (Z = performance.now(), this._parked = !1, this.requestRef = requestAnimationFrame(Q));
		}, { threshold: 0 }), this._visibilityObserver.observe(t), this._visibilityHandler = () => {
			let e = this._isVisible;
			document.visibilityState === "hidden" ? this._isVisible = !1 : (this._isVisible = !0, e || (Z = performance.now(), this._parked = !1, this.requestRef = requestAnimationFrame(Q)));
		}, document.addEventListener("visibilitychange", this._visibilityHandler);
		let $ = (e, t, n = !1) => {
			n && this._renderScale !== 1 && this._cssWidth > 0 && e !== this._cssWidth && e === this._ref.width && t === this._ref.height && (console.warn("NeatGradient: ignoring renderScale — the canvas takes its size from its width/height attributes. Size it with CSS to use renderScale."), this._renderScale = 1, e = this._cssWidth, t = this._cssHeight), this._cssWidth = e, this._cssHeight = t;
			let r = Math.max(1, Math.round(e * this._renderScale)), i = Math.max(1, Math.round(t * this._renderScale));
			if (this._ref.width === r && this._ref.height === i) return;
			let { gl: a, camera: s } = this.glState;
			this._ref.width = r, this._ref.height = i, a.viewport(0, 0, r, i), o(s, r, i, F, I, this._shapeType, this._cameraZoom), this._uploadProjection(), this._uniformsDirty = !0, this._segmentsFor(this._meshBase, r, i) !== this._segmentsInUse && this._updateGeometry(), Q();
		};
		this._applySize = $, this.sizeObserver = new ResizeObserver((e) => {
			let t = e[e.length - 1], n = Math.round(t.contentRect.width), r = Math.round(t.contentRect.height);
			this._resizeTimeoutId !== null && clearTimeout(this._resizeTimeoutId), this._resizeTimeoutId = window.setTimeout(() => {
				$(n, r, !0), this._resizeTimeoutId = null, this._wmCachedRect = null;
			}, 100);
		}), this.sizeObserver.observe(t), Q();
	}
	destroy() {
		if (this._destroyed = !0, cancelAnimationFrame(this.requestRef), this.sizeObserver.disconnect(), this._visibilityObserver &&= (this._visibilityObserver.disconnect(), null), this._visibilityHandler &&= (document.removeEventListener("visibilitychange", this._visibilityHandler), null), this._resizeTimeoutId !== null && (clearTimeout(this._resizeTimeoutId), this._resizeTimeoutId = null), this._wmClickHandler &&= (document.removeEventListener("click", this._wmClickHandler, !0), null), this._wmMoveHandler &&= (document.removeEventListener("mousemove", this._wmMoveHandler), null), this.glState) {
			let e = this.glState.gl;
			this._deleteProgram(e, this.glState.program), e.deleteBuffer(this.glState.buffers.position), e.deleteBuffer(this.glState.buffers.normal), e.deleteBuffer(this.glState.buffers.uv), e.deleteBuffer(this.glState.buffers.index), e.deleteBuffer(this.glState.buffers.wireframeIndex), this._watermarkProgram && this._deleteProgram(e, this._watermarkProgram), this._watermarkTexture && e.deleteTexture(this._watermarkTexture), this._watermarkBuffer && e.deleteBuffer(this._watermarkBuffer), this._watermarkTexCoordBuffer && e.deleteBuffer(this._watermarkTexCoordBuffer);
			let t = e;
			t.deleteVertexArray && (this._gradientVAO && t.deleteVertexArray(this._gradientVAO), this._watermarkVAO && t.deleteVertexArray(this._watermarkVAO));
		}
		if (this.glState) {
			let e = this.glState.gl;
			for (let t of [this._pendingGradient, this._pendingBake]) t && (e.deleteShader(t.vertex), e.deleteShader(t.fragment), t.program !== this.glState.program && this._deleteProgram(e, t.program));
			this._pendingGradient = null, this._pendingBake = null, this._bakeProgram &&= (e.deleteProgram(this._bakeProgram), null), this._bakeQuad &&= (e.deleteBuffer(this._bakeQuad), null), this._bakeFbo &&= (e.deleteFramebuffer(this._bakeFbo), null), this._bakeVao &&= (e.deleteVertexArray(this._bakeVao), null), this._shapeTexture &&= (this.glState.gl.deleteTexture(this._shapeTexture), null), this._auxTexture &&= (this.glState.gl.deleteTexture(this._auxTexture), null);
		}
		this._proceduralTexture && this.glState && this.glState.gl.deleteTexture(this._proceduralTexture);
	}
	get colors() {
		return this._colors;
	}
	set colors(e) {
		this._uniformsDirty = !0, this._colors = e, this._cachedColorRgb = e.map((e) => this._hexToRgb(e.color)), this._colorsChanged = !0;
	}
	get grainScale() {
		return this._grainScale;
	}
	set grainScale(e) {
		this._uniformsDirty = !0, this._grainScale = e == 0 ? 1 : e;
	}
	get renderScale() {
		return this._renderScale;
	}
	set renderScale(e) {
		let t = Math.min(Math.max(e, .1), 3);
		this._renderScale !== t && (this._renderScale = t, this._applySize && this._cssWidth > 0 && this._applySize(this._cssWidth, this._cssHeight));
	}
	get resolution() {
		return this._resolution;
	}
	set resolution(e) {
		this._resolution !== e && (this._resolution = e, this._updateGeometry());
	}
	get antialias() {
		return this._antialias;
	}
	set antialias(e) {
		this._antialias !== e && (this._antialias = e, console.warn("NeatGradient: Changing 'antialias' at runtime is not supported because the WebGL context is already created. Recreate the NeatGradient instance to apply this change."));
	}
	get backgroundColor() {
		return this._backgroundColor;
	}
	set backgroundColor(e) {
		this._uniformsDirty = !0, this._backgroundColor = e, this._backgroundColorRgb = this._hexToRgb(e);
	}
	get yOffset() {
		return this._yOffset;
	}
	set yOffset(e) {
		this._yOffset !== e && (this._yOffsetDirty = !0, this._yOffset = e);
	}
	get textureMode() {
		return this._textureMode;
	}
	set textureMode(e) {
		let t = e === "baked" ? "baked" : "bitmap";
		this._textureMode !== t && (this._textureMode = t, this._bakeWarned = !1, this._enableProceduralTexture && (this._textureNeedsUpdate = !0));
	}
	get textureBakeResolution() {
		return this._textureBakeResolution;
	}
	set textureBakeResolution(e) {
		this._textureBakeResolution !== e && (this._textureBakeResolution = e, this._enableProceduralTexture && (this._textureNeedsUpdate = !0));
	}
	get bakeEdgeSoftness() {
		return this._bakeEdgeSoftness;
	}
	set bakeEdgeSoftness(e) {
		this._bakeEdgeSoftness !== e && (this._bakeEdgeSoftness = e, this._enableProceduralTexture && (this._textureNeedsUpdate = !0));
	}
	get activeTextureMode() {
		return this._activeTextureMode;
	}
	get enableProceduralTexture() {
		return this._enableProceduralTexture;
	}
	set enableProceduralTexture(e) {
		this._uniformsDirty = !0, this._enableProceduralTexture = e, e && !this._proceduralTexture && (this._textureNeedsUpdate = !0);
	}
	_updateGeometry() {
		if (!this.glState) return;
		let e = this.glState.gl, t = this._segmentsFor(this._meshBase, this._ref.width, this._ref.height);
		this._segmentsInUse = t;
		let n;
		n = this._shapeType === "sphere" ? c(this._sphereRadius, t, t) : this._shapeType === "torus" ? l(this._torusRadius, this._torusTube, t, t) : this._shapeType === "cylinder" ? u(this._cylinderRadius, this._cylinderRadius, this._cylinderHeight, t, t) : this._shapeType === "ribbon" ? d(F, I, t, t, this._planeBend, this._planeTwist) : s(F, I, t, t);
		let { position: r, normal: i, uv: a, index: f, wireframeIndex: p } = n;
		e.bindBuffer(e.ARRAY_BUFFER, this.glState.buffers.position), e.bufferData(e.ARRAY_BUFFER, r, e.STATIC_DRAW), e.bindBuffer(e.ARRAY_BUFFER, this.glState.buffers.normal), e.bufferData(e.ARRAY_BUFFER, i, e.STATIC_DRAW), e.bindBuffer(e.ARRAY_BUFFER, this.glState.buffers.uv), e.bufferData(e.ARRAY_BUFFER, a, e.STATIC_DRAW), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, this.glState.buffers.index), e.bufferData(e.ELEMENT_ARRAY_BUFFER, f, e.STATIC_DRAW), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, this.glState.buffers.wireframeIndex), e.bufferData(e.ELEMENT_ARRAY_BUFFER, p, e.STATIC_DRAW), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, this.glState.buffers.index), this.glState.indexCount = f.length, this.glState.wireframeIndexCount = p.length, this.glState.indexType = f instanceof Uint32Array ? e.UNSIGNED_INT : e.UNSIGNED_SHORT;
		let m = this._ref.width, h = this._ref.height;
		o(this.glState.camera, m, h, F, I, this._shapeType, this._cameraZoom), this._uploadProjection(), this._uniformsDirty = !0;
	}
	_uploadProjection() {
		if (!this._initialized) return;
		let e = this.glState.gl, t = this.glState.locations.uniforms.projectionMatrix;
		e.useProgram(this.glState.program), t && e.uniformMatrix4fv(t, !1, this.glState.camera.projectionMatrix.elements);
	}
	_hexToRgb(e) {
		let t = parseInt(e.replace("#", ""), 16);
		return [
			(t >> 16 & 255) / 255,
			(t >> 8 & 255) / 255,
			(t & 255) / 255
		];
	}
	_initScene(e, t = !1) {
		let n = this._ref.width, r = this._ref.height;
		(n === 0 || r === 0 || n === 300 && r === 150) && (n = this._ref.clientWidth || 300, r = this._ref.clientHeight || 150), this._cssWidth = n, this._cssHeight = r;
		let i = Math.max(1, Math.round(n * this._renderScale)), f = Math.max(1, Math.round(r * this._renderScale));
		this._ref.width = i, this._ref.height = f;
		let p = this._ref.getContext("webgl2", {
			alpha: !0,
			preserveDrawingBuffer: t,
			antialias: this._antialias
		}), m = p || this._ref.getContext("webgl", {
			alpha: !0,
			preserveDrawingBuffer: t,
			antialias: this._antialias
		});
		if (!m) throw Error("WebGL not supported");
		this._isWebGL2 = !!p;
		let h = m.getExtension("OES_standard_derivatives");
		m.getExtension("OES_element_index_uint"), this._parallelCompile = m.getExtension("KHR_parallel_shader_compile"), this._derivativesSupported = this._isWebGL2 || !!h, m.viewport(0, 0, i, f);
		let g = this._segmentsFor(this._meshBase, i, f);
		this._segmentsInUse = g;
		let _;
		_ = this._shapeType === "sphere" ? c(this._sphereRadius, g, g) : this._shapeType === "torus" ? l(this._torusRadius, this._torusTube, g, g) : this._shapeType === "cylinder" ? u(this._cylinderRadius, this._cylinderRadius, this._cylinderHeight, g, g) : this._shapeType === "ribbon" ? d(F, I, g, g, this._planeBend, this._planeTwist) : s(F, I, g, g);
		let { position: v, normal: y, uv: b, index: x, wireframeIndex: S } = _, C = m.createBuffer();
		m.bindBuffer(m.ARRAY_BUFFER, C), m.bufferData(m.ARRAY_BUFFER, v, m.STATIC_DRAW);
		let w = m.createBuffer();
		m.bindBuffer(m.ARRAY_BUFFER, w), m.bufferData(m.ARRAY_BUFFER, y, m.STATIC_DRAW);
		let T = m.createBuffer();
		m.bindBuffer(m.ARRAY_BUFFER, T), m.bufferData(m.ARRAY_BUFFER, b, m.STATIC_DRAW);
		let E = m.createBuffer();
		m.bindBuffer(m.ELEMENT_ARRAY_BUFFER, E), m.bufferData(m.ELEMENT_ARRAY_BUFFER, x, m.STATIC_DRAW);
		let D = m.createBuffer();
		m.bindBuffer(m.ELEMENT_ARRAY_BUFFER, D), m.bufferData(m.ELEMENT_ARRAY_BUFFER, S, m.STATIC_DRAW), m.bindBuffer(m.ELEMENT_ARRAY_BUFFER, E), this._pendingGradient = this._compileProgram(m);
		let O = this._pendingGradient.program, k = new a(0, 0, 0, 0, 0, 1e3);
		k.position = [
			0,
			0,
			5
		], o(k, i, f, F, I, this._shapeType, this._cameraZoom);
		let A = R.indexOf("position"), j = R.indexOf("normal"), M = R.indexOf("uv");
		p && (this._gradientVAO = p.createVertexArray(), p.bindVertexArray(this._gradientVAO)), m.enableVertexAttribArray(A), m.bindBuffer(m.ARRAY_BUFFER, C), m.vertexAttribPointer(A, 3, m.FLOAT, !1, 0, 0), m.enableVertexAttribArray(j), m.bindBuffer(m.ARRAY_BUFFER, w), m.vertexAttribPointer(j, 3, m.FLOAT, !1, 0, 0), m.enableVertexAttribArray(M), m.bindBuffer(m.ARRAY_BUFFER, T), m.vertexAttribPointer(M, 2, m.FLOAT, !1, 0, 0), m.bindBuffer(m.ELEMENT_ARRAY_BUFFER, E);
		let N = {
			attributes: {
				position: A,
				normal: j,
				uv: M
			},
			uniforms: {}
		};
		return m.enable(m.BLEND), m.blendFunc(m.SRC_ALPHA, m.ONE_MINUS_SRC_ALPHA), m.enable(m.DEPTH_TEST), {
			gl: m,
			program: O,
			buffers: {
				position: C,
				normal: w,
				uv: T,
				index: E,
				wireframeIndex: D
			},
			locations: N,
			camera: k,
			indexCount: x.length,
			wireframeIndexCount: S.length,
			indexType: x instanceof Uint32Array ? m.UNSIGNED_INT : m.UNSIGNED_SHORT
		};
	}
	_resolveProgramLocations(e, t, n) {
		(/* @__PURE__ */ "projectionMatrix.modelViewMatrix.u_time.u_resolution.u_color_pressure.u_wave_frequency_x.u_wave_frequency_y.u_wave_amplitude.u_wave2_frequency_x.u_wave2_frequency_y.u_wave2_amplitude.u_wave2_speed.u_wave2_angle.u_colors_count.u_plane_width.u_plane_height.u_shadows.u_highlights.u_grain_intensity.u_grain_sparsity.u_grain_scale.u_grain_speed.u_flow_distortion_a.u_flow_distortion_b.u_flow_scale.u_flow_ease.u_flow_enabled.u_y_offset.u_y_offset_wave_multiplier.u_y_offset_color_multiplier.u_y_offset_flow_multiplier.u_procedural_texture.u_enable_procedural_texture.u_texture_ease.u_transparent_texture_void.u_saturation.u_brightness.u_color_blending.u_domain_warp_enabled.u_domain_warp_intensity.u_domain_warp_scale.u_vignette_intensity.u_vignette_radius.u_fresnel_enabled.u_fresnel_power.u_fresnel_intensity.u_fresnel_color.u_iridescence_enabled.u_iridescence_intensity.u_iridescence_speed.u_prism_edge_intensity.u_prism_edge_thinness.u_prism_edge_spread.u_prism_edge_speed.u_prism_edge_ripple.u_bloom_intensity.u_bloom_threshold.u_chromatic_aberration.u_shape_type.u_silhouette_fade.u_cylinder_fade.u_ribbon_fade.u_flat_shading.u_neat_shapes.u_neat_aux.u_neat_grid_dim.u_neat_items_row.u_neat_stripes_row.u_neat_stripe_count.u_neat_stripe_lut_row.u_neat_tile.u_neat_bg0.u_neat_bg1.u_neat_base.u_neat_void_alpha.u_neat_edge_softness.u_neat_seam_blend".split(".")).forEach((r) => {
			n.uniforms[r] = e.getUniformLocation(t, r);
		});
		for (let r = 0; r < L; r++) n.uniforms[`u_colors[${r}].is_active`] = e.getUniformLocation(t, `u_colors[${r}].is_active`), n.uniforms[`u_colors[${r}].color`] = e.getUniformLocation(t, `u_colors[${r}].color`), n.uniforms[`u_colors[${r}].influence`] = e.getUniformLocation(t, `u_colors[${r}].influence`);
		n.attributes.position = e.getAttribLocation(t, "position"), n.attributes.normal = e.getAttribLocation(t, "normal"), n.attributes.uv = e.getAttribLocation(t, "uv");
	}
	_shaderFeatureKey() {
		return [
			this._flatShading,
			this._flowEnabled,
			this._enableProceduralTexture,
			this._domainWarpEnabled,
			this._fresnelEnabled,
			this._iridescenceEnabled,
			this._secondaryWaveEnabled,
			this._prismEdgeEnabled,
			this._vignetteIntensity > 0,
			this._bloomIntensity > 0,
			this._chromaticAberration > 0,
			this._grainIntensity > 0
		].map((e) => e ? "1" : "0").join("");
	}
	_buildShaderDefines() {
		let e = (e, t) => `#define ${e} ${t ? "1.0" : "0.0"}\n`;
		return e("NEAT_FLAT_SHADING", this._flatShading) + e("NEAT_FLOW_ENABLED", this._flowEnabled) + e("NEAT_PROC_TEXTURE_ENABLED", this._enableProceduralTexture) + e("NEAT_DOMAIN_WARP_ENABLED", this._domainWarpEnabled) + e("NEAT_FRESNEL_ENABLED", this._fresnelEnabled) + e("NEAT_IRIDESCENCE_ENABLED", this._iridescenceEnabled) + e("NEAT_SECONDARY_WAVE_ENABLED", this._secondaryWaveEnabled) + e("NEAT_PRISM_EDGE_ENABLED", this._prismEdgeEnabled) + e("NEAT_VIGNETTE_ENABLED", this._vignetteIntensity > 0) + e("NEAT_BLOOM_ENABLED", this._bloomIntensity > 0) + e("NEAT_CHROMATIC_ENABLED", this._chromaticAberration > 0) + e("NEAT_GRAIN_ENABLED", this._grainIntensity > 0);
	}
	_rebuildProgram() {
		let e = this.glState.gl, t = this._pendingGradient;
		t && (e.deleteShader(t.vertex), e.deleteShader(t.fragment), this._deleteProgram(e, t.program)), this._pendingGradient = this._compileProgram(e);
	}
	_compileProgram(i) {
		let a = this._buildShaderDefines();
		this._shaderKey = this._shaderFeatureKey();
		let o = a + e() + "\n" + n() + "\n" + r() + "\nvoid main() {\nvUv = uv;\nvPosition = position;\nfloat waveOffset = -u_y_offset * u_y_offset_wave_multiplier;\nfloat colorOffset = -u_y_offset * u_y_offset_color_multiplier;\nfloat flowOffset = -u_y_offset * u_y_offset_flow_multiplier;\nv_displacement_amount = cnoise( vec3(\nu_wave_frequency_x * position.x + u_time,\nu_wave_frequency_y * (position.y + waveOffset) + u_time,\nu_time\n));\nif (NEAT_SECONDARY_WAVE_ENABLED > 0.5) {\nfloat t2 = u_time * u_wave2_speed;\nfloat ca = cos(u_wave2_angle);\nfloat sa = sin(u_wave2_angle);\nfloat px = position.x;\nfloat py = position.y + waveOffset;\nvec2 rp = vec2(ca * px - sa * py, sa * px + ca * py);\nfloat secondary = cnoise( vec3(\nu_wave2_frequency_x * rp.x + t2,\nu_wave2_frequency_y * rp.y - t2,\nt2 * 0.6 + 41.7\n));\nv_displacement_amount = (v_displacement_amount + secondary * u_wave2_amplitude)\n/ (1.0 + u_wave2_amplitude);\n}\nvec2 baseUv = vUv;\nbaseUv.y += flowOffset / u_plane_height;\nvec2 flowUv = baseUv;\nif (NEAT_FLOW_ENABLED > 0.5) {\nif (u_flow_ease > 0.0 || u_flow_distortion_a > 0.0) {\nvec2 ppp = -1.0 + 2.0 * baseUv;\nppp += 0.1 * cos((1.5 * u_flow_scale) * ppp.yx + 1.1 * u_time + vec2(0.1, 1.1));\nppp += 0.1 * cos((2.3 * u_flow_scale) * ppp.yx + 1.3 * u_time + vec2(3.2, 3.4));\nppp += 0.1 * cos((2.2 * u_flow_scale) * ppp.yx + 1.7 * u_time + vec2(1.8, 5.2));\nppp += u_flow_distortion_a * cos((u_flow_distortion_b * u_flow_scale) * ppp.yx + 1.4 * u_time + vec2(6.3, 3.9));\nfloat r = length(ppp);\nflowUv = mix(baseUv, vec2(baseUv.x * (1.0 - u_flow_ease) + r * u_flow_ease, baseUv.y), u_flow_ease);\n}\n}\nvFlowUv = flowUv;\nvec3 color = u_colors[0].color;\nvec3 distortedPos = position;\nif (NEAT_FLAT_SHADING < 0.5) {\nif (NEAT_FLOW_ENABLED > 0.5) {\nif (u_flow_ease > 0.0 || u_flow_distortion_a > 0.0) {\nvec3 ppp = position / 25.0;\nppp.xyz += 0.1 * cos((1.5 * u_flow_scale) * ppp.yxz + 1.1 * u_time + vec3(0.1, 1.1, 2.1));\nppp.xyz += 0.1 * cos((2.3 * u_flow_scale) * ppp.zxy + 1.3 * u_time + vec3(3.2, 3.4, 1.2));\nppp.xyz += 0.1 * cos((2.2 * u_flow_scale) * ppp.yxz + 1.7 * u_time + vec3(1.8, 5.2, 3.1));\nppp.xyz += u_flow_distortion_a * cos((u_flow_distortion_b * u_flow_scale) * ppp.zxy + 1.4 * u_time + vec3(6.3, 3.9, 4.5));\nfloat r = length(ppp);\ndistortedPos = mix(position, vec3(\nposition.x * (1.0 - u_flow_ease) + r * u_flow_ease * 25.0,\nposition.y,\nposition.z * (1.0 - u_flow_ease) + r * u_flow_ease * 25.0\n), u_flow_ease);\n}\n}\n}\nvec3 noise_cord;\nif (NEAT_FLAT_SHADING < 0.5) {\nnoise_cord = vec3(distortedPos.x / 50.0, (distortedPos.y + colorOffset) / 50.0, distortedPos.z / 50.0);\n} else {\nvec2 adjustedUv = flowUv;\nadjustedUv.y += colorOffset / u_plane_height;\nnoise_cord = vec3(adjustedUv, 0.0);\n}\nconst float minNoise = .0;\nconst float maxNoise = .9;\nvec2 edge = vec2(0.0);\nif (NEAT_PROC_TEXTURE_ENABLED < 0.5 || NEAT_PRISM_EDGE_ENABLED > 0.5) {\nfor (int i = 1; i < 6; i++) {\nif (u_colors[i].is_active > 0.5) {\nfloat noiseFlow = (1. + float(i)) / 30.;\nfloat noiseSpeed = (1. + float(i)) * 0.11;\nfloat noiseSeed = 13. + float(i) * 7.;\nfloat noise_z = u_time * noiseSpeed;\nif (NEAT_FLAT_SHADING < 0.5) {\nnoise_z = noise_cord.z * u_color_pressure.x * u_color_pressure.x + u_time * noiseSpeed;\n}\nfloat noise = snoise(\nvec3(\nnoise_cord.x * u_color_pressure.x * u_color_pressure.x + u_time * noiseFlow * 2.,\nnoise_cord.y * u_color_pressure.y * u_color_pressure.y,\nnoise_z\n) + noiseSeed\n) - (.1 * float(i)) + (.5 * u_color_blending);\nnoise += (u_colors[i].influence - 1.0) * 0.6;\nnoise = clamp(noise, minNoise, maxNoise + float(i) * 0.02);\nfloat mixAmount = smoothstep(0.0, u_color_blending, noise);\nmixAmount *= smoothstep(0.0, 0.08, u_colors[i].influence);\ncolor = mix(color, u_colors[i].color, mixAmount);\nif (NEAT_PRISM_EDGE_ENABLED > 0.5) {\nedge.x *= (1.0 - mixAmount);\nedge.x = max(edge.x, 4.0 * mixAmount * (1.0 - mixAmount));\nedge.y += mixAmount;\n}\n}\n}\n}\nv_color = color;\nv_edge = edge;\nvec3 newPosition = position + normal * v_displacement_amount * u_wave_amplitude;\nvec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);\nvNormal = normalize((modelViewMatrix * vec4(normal, 0.0)).xyz);\ngl_Position = projectionMatrix * mvPosition;\nv_new_position = gl_Position;\n}", s = a + t() + "\n" + r() + "\n" + n() + "\nfloat random(vec2 p) {\nreturn fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);\n}\nfloat fbm(vec3 x) {\nfloat value = 0.0;\nfloat amplitude = 0.5;\nfloat frequency = 1.0;\nfor (int i = 0; i < 2; i++) {\nvalue += amplitude * snoise(x * frequency);\nfrequency *= 2.0;\namplitude *= 0.5;\n}\nreturn value;\n}\nvec4 permuteFast(vec4 x) {\nreturn mod(((x * 34.0) + 1.0) * x, 289.0);\n}\nfloat snoiseFast(vec3 v) {\nconst vec2 C = vec2(1.0/6.0, 1.0/3.0) ;\nconst vec4 D = vec4(0.0, 0.5, 1.0, 2.0);\nvec3 i = floor(v + dot(v, C.yyy) );\nvec3 x0 = v - i + dot(i, C.xxx) ;\nvec3 g = step(x0.yzx, x0.xyz);\nvec3 l = 1.0 - g;\nvec3 i1 = min( g.xyz, l.zxy );\nvec3 i2 = max( g.xyz, l.zxy );\nvec3 x1 = x0 - i1 + C.xxx;\nvec3 x2 = x0 - i2 + C.yyy;\nvec3 x3 = x0 - D.yyy;\ni = mod(i, 289.0);\nvec4 p = permuteFast( permuteFast( permuteFast(\ni.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n+ i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\nfloat n_ = 0.142857142857;\nvec3 ns = n_ * D.wyz - D.xzx;\nvec4 j = p - 49.0 * floor(p * ns.z * ns.z);\nvec4 x_ = floor(j * ns.z);\nvec4 y_ = floor(j - 7.0 * x_ );\nvec4 x = x_ *ns.x + ns.yyyy;\nvec4 y = y_ *ns.x + ns.yyyy;\nvec4 h = 1.0 - abs(x) - abs(y);\nvec4 b0 = vec4( x.xy, y.xy );\nvec4 b1 = vec4( x.zw, y.zw );\nvec4 s0 = floor(b0)*2.0 + 1.0;\nvec4 s1 = floor(b1)*2.0 + 1.0;\nvec4 sh = -step(h, vec4(0.0));\nvec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\nvec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;\nvec3 p0 = vec3(a0.xy,h.x);\nvec3 p1 = vec3(a0.zw,h.y);\nvec3 p2 = vec3(a1.xy,h.z);\nvec3 p3 = vec3(a1.zw,h.w);\nvec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\np0 *= norm.x;\np1 *= norm.y;\np2 *= norm.z;\np3 *= norm.w;\nvec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\nm = m * m;\nreturn 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),\ndot(p2,x2), dot(p3,x3) ) );\n}\nfloat grainFbm(vec3 x) {\nreturn 0.5 * snoiseFast(x) + 0.25 * snoiseFast(x * 2.0);\n}\nvec3 hsl2rgb(float h, float s, float l) {\nvec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);\nreturn l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));\n}\nvec3 thinFilm(float t) {\nconst vec3 inverseWavelength = vec3(1.0, 1.18, 1.42);\nvec3 f = 0.5 + 0.5 * cos(6.283185 * inverseWavelength * t);\nreturn f / max(max(f.r, max(f.g, f.b)), 0.0001);\n}\nvoid main() {\nvec2 finalUv = vFlowUv;\nvec3 baseColor;\nfloat texAlpha = 1.0;\nif (NEAT_PROC_TEXTURE_ENABLED > 0.5) {\nif (NEAT_FLAT_SHADING < 0.5) {\nfloat parallaxFactor = 0.25;\nfloat scrollOffset = (u_y_offset * u_y_offset_color_multiplier) * parallaxFactor;\nvec3 scrolledPos = vPosition;\nscrolledPos.y -= scrollOffset;\nvec3 p = (scrolledPos * 1.5) / 50.0;\nvec2 uvX = p.yz + vec2(0.5);\nvec2 uvY = p.zx + vec2(0.5);\nvec2 uvZ = p.xy + vec2(0.5);\nvec4 colX = texture2D(u_procedural_texture, uvX);\nvec4 colY = texture2D(u_procedural_texture, uvY);\nvec4 colZ = texture2D(u_procedural_texture, uvZ);\nvec3 n = normalize(vNormal);\nvec3 blendWeights = abs(n);\nblendWeights = blendWeights / (blendWeights.x + blendWeights.y + blendWeights.z + 0.0001);\nvec4 texSample = colX * blendWeights.x + colY * blendWeights.y + colZ * blendWeights.z;\nbaseColor = texSample.rgb;\nif (u_transparent_texture_void > 0.5) {\ntexAlpha = texSample.a;\n}\n} else {\nvec2 ppp = -1.0 + 2.0 * finalUv;\nppp += 0.1 * cos((1.5 * u_flow_scale) * ppp.yx + 1.1 * u_time + vec2(0.1, 1.1));\nppp += 0.1 * cos((2.3 * u_flow_scale) * ppp.yx + 1.3 * u_time + vec2(3.2, 3.4));\nppp += 0.1 * cos((2.2 * u_flow_scale) * ppp.yx + 1.7 * u_time + vec2(1.8, 5.2));\nppp += u_flow_distortion_a * cos((u_flow_distortion_b * u_flow_scale) * ppp.yx + 1.4 * u_time + vec2(6.3, 3.9));\nfloat r = length(ppp);\nfloat vx = (finalUv.x * u_texture_ease) + (r * (1.0 - u_texture_ease));\nfloat vy = (finalUv.y * u_texture_ease) + (0.0 * (1.0 - u_texture_ease));\nvec2 texUv = vec2(vx, vy);\nfloat parallaxFactor = 0.25;\ntexUv.y -= (u_y_offset * u_y_offset_color_multiplier / u_plane_height) * parallaxFactor;\ntexUv *= 1.5;\nvec4 texSample = texture2D(u_procedural_texture, texUv);\nbaseColor = texSample.rgb;\nif (u_transparent_texture_void > 0.5) {\ntexAlpha = texSample.a;\n}\n}\n} else {\nbaseColor = v_color;\n}\nvec3 color = baseColor;\nif (NEAT_DOMAIN_WARP_ENABLED > 0.5) {\nvec3 p;\nif (NEAT_FLAT_SHADING < 0.5) {\np = vec3((vPosition / 50.0 + vec3(0.5)) * u_domain_warp_scale);\np.z += u_time * 0.15;\n} else {\np = vec3(finalUv * u_domain_warp_scale, u_time * 0.15);\n}\nvec2 q = vec2(fbm(p), fbm(p + vec3(5.2, 1.3, 0.0)));\nfloat f = fbm(p + vec3(4.0 * q, 0.0));\nvec3 warpColor = color * (1.0 + f * 0.8 * u_domain_warp_intensity);\nfloat pattern = clamp(f * f * f + 0.6 * f * f + 0.5 * f, 0.0, 1.0);\ncolor = mix(color, warpColor * (0.6 + pattern * 0.8), u_domain_warp_intensity * 0.7);\n}\nvec3 normal = normalize(vNormal);\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nfloat ndotv = dot(normal, viewDir);\nif (u_shape_type > 0.5 && u_shape_type < 3.5) {\nif (ndotv < 0.0) {\ndiscard;\n}\n} else {\nif (ndotv < 0.0) {\nnormal = -normal;\nndotv = -ndotv;\n}\n}\nvec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));\nfloat diffuse = max(dot(normal, lightDir), 0.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat specular = pow(max(dot(normal, halfDir), 0.0), 32.0);\nif (NEAT_FLAT_SHADING > 0.5) {\ncolor += v_displacement_amount * u_highlights;\nfloat heightShadow = 1.0 - v_displacement_amount;\ncolor -= heightShadow * heightShadow * u_shadows;\n} else {\ncolor += specular * u_highlights;\ncolor += v_displacement_amount * u_highlights * 0.5;\nfloat heightShadow = 1.0 - v_displacement_amount;\ncolor -= heightShadow * heightShadow * u_shadows * 0.5;\ncolor -= (1.0 - diffuse) * u_shadows * 0.5;\n}\ncolor = saturation(color, 1.0 + u_saturation);\ncolor = color * u_brightness;\nif (NEAT_IRIDESCENCE_ENABLED > 0.5) {\nfloat hue = fract(v_displacement_amount * 0.5 + 0.5 + u_time * u_iridescence_speed * 0.05);\nvec3 iriColor = hsl2rgb(hue, 0.8, 0.6);\ncolor = mix(color, iriColor, u_iridescence_intensity * abs(v_displacement_amount) * 0.6);\n}\nif (NEAT_PRISM_EDGE_ENABLED > 0.5) {\nfloat band = pow(clamp(v_edge.x, 0.0, 1.0), max(u_prism_edge_thinness, 0.001));\nfloat thickness = v_edge.y * u_prism_edge_spread\n+ v_displacement_amount * u_prism_edge_ripple\n+ u_time * u_prism_edge_speed * 0.05;\nvec3 fringe = thinFilm(thickness);\nconst vec3 luma = vec3(0.2126, 0.7152, 0.0722);\nvec3 tinted = fringe * (dot(color, luma) / max(dot(fringe, luma), 0.001));\ncolor = mix(color, min(tinted, vec3(1.0)), band * clamp(u_prism_edge_intensity, 0.0, 1.0));\n}\nif (NEAT_FRESNEL_ENABLED > 0.5) {\nfloat slope = 1.0 - abs(v_displacement_amount);\nfloat fresnel = pow(max(slope, 0.0), u_fresnel_power);\ncolor += u_fresnel_color * fresnel * u_fresnel_intensity;\n}\nif (NEAT_VIGNETTE_ENABLED > 0.5 && u_vignette_intensity > 0.0) {\nvec2 vigUv = vUv;\nif (NEAT_FLAT_SHADING < 0.5) {\nvigUv = (v_new_position.xy / v_new_position.w) * 0.5 + vec2(0.5);\n}\nfloat dist = length(vigUv - vec2(0.5));\nfloat vig = smoothstep(u_vignette_radius, u_vignette_radius * 0.3, dist);\ncolor *= mix(1.0, vig, u_vignette_intensity);\n}\nif (NEAT_BLOOM_ENABLED > 0.5 && u_bloom_intensity > 0.0) {\nfloat luma = dot(color, vec3(0.2126, 0.7152, 0.0722));\nfloat bloomMask = smoothstep(u_bloom_threshold, 1.0, luma);\ncolor += color * bloomMask * u_bloom_intensity;\n}\nif (NEAT_CHROMATIC_ENABLED > 0.5 && u_chromatic_aberration > 0.0) {\nfloat caAmount = u_chromatic_aberration * 0.008;\nvec2 caUv = vUv;\nif (NEAT_FLAT_SHADING < 0.5) {\ncaUv = (v_new_position.xy / v_new_position.w) * 0.5 + vec2(0.5);\n}\nfloat dist = length(caUv - vec2(0.5));\nfloat rShift = v_displacement_amount + caAmount * dist;\nfloat bShift = v_displacement_amount - caAmount * dist;\ncolor.r *= 1.0 + rShift * caAmount * 10.0;\ncolor.b *= 1.0 - bShift * caAmount * 10.0;\n}\nfloat grain = 0.0;\nif (NEAT_GRAIN_ENABLED > 0.5 && u_grain_intensity > 0.0) {\nvec2 noiseCoords = gl_FragCoord.xy / u_grain_scale;\nif (u_grain_speed != 0.0 || NEAT_FLAT_SHADING > 0.5) {\ngrain = grainFbm(vec3(noiseCoords, u_time * u_grain_speed));\n} else {\ngrain = random(noiseCoords) - 0.5;\n}\ngrain = grain * 0.5 + 0.5;\ngrain -= 0.5;\ngrain = (grain > u_grain_sparsity) ? grain : 0.0;\ngrain *= u_grain_intensity;\n}\ncolor += vec3(grain);\nfloat edgeAlpha = 1.0;\nif (u_silhouette_fade > 0.0 && NEAT_FLAT_SHADING < 0.5) {\nedgeAlpha = smoothstep(0.0, u_silhouette_fade, ndotv);\n}\nif (u_shape_type == 3.0) {\nfloat vFade = smoothstep(0.0, u_cylinder_fade, vUv.y) * smoothstep(1.0, 1.0 - u_cylinder_fade, vUv.y);\nedgeAlpha *= vFade;\n} else if (u_shape_type == 4.0) {\nfloat uFade = smoothstep(0.0, u_ribbon_fade, vUv.x) * smoothstep(1.0, 1.0 - u_ribbon_fade, vUv.x);\nfloat vFade = smoothstep(0.0, u_ribbon_fade, vUv.y) * smoothstep(1.0, 1.0 - u_ribbon_fade, vUv.y);\nedgeAlpha *= uFade * vFade;\n}\nedgeAlpha *= texAlpha;\ngl_FragColor = vec4(color, edgeAlpha);\n}";
		return this._startProgram(i, o, s, R);
	}
	_startProgram(e, t, n, r) {
		let i = e.createShader(e.VERTEX_SHADER);
		e.shaderSource(i, t), e.compileShader(i);
		let a = e.createShader(e.FRAGMENT_SHADER);
		e.shaderSource(a, n), e.compileShader(a);
		let o = e.createProgram();
		return e.attachShader(o, i), e.attachShader(o, a), r.forEach((t, n) => e.bindAttribLocation(o, n, t)), e.linkProgram(o), {
			program: o,
			vertex: i,
			fragment: a,
			vertexSource: t,
			fragmentSource: n
		};
	}
	_linked(e, t) {
		let n = this._parallelCompile;
		return !n || e.getProgramParameter(t, n.COMPLETION_STATUS_KHR) !== !1;
	}
	_deleteProgram(e, t) {
		this._linked(e, t) ? e.deleteProgram(t) : setTimeout(() => this._deleteProgram(e, t), 16);
	}
	_completeStartup() {
		let e = this.glState.gl, t = this._pendingGradient;
		return t && !this._linked(e, t.program) || this._pendingBake && !this._linked(e, this._pendingBake.program) ? !1 : (t && (this._pendingGradient = null, this._wireProgram(e, t)), this._initialized = !0, !0);
	}
	_wireProgram(e, t) {
		let { program: n, vertex: r, fragment: i } = t;
		e.getShaderParameter(r, e.COMPILE_STATUS) || (console.log("VERTEX_SHADER_ERROR_START"), console.log("Vertex shader error: ", e.getShaderInfoLog(r)), console.log("GL Error Code:", e.getError()), console.log("Vertex Shader Source Dump:"), console.log(t.vertexSource.split("\n").map((e, t) => `${t + 1}: ${e}`).join("\n")), console.log("VERTEX_SHADER_ERROR_END")), e.getShaderParameter(i, e.COMPILE_STATUS) || (console.log("FRAGMENT_SHADER_ERROR_START"), console.log("Fragment shader error: ", e.getShaderInfoLog(i)), console.log("GL Error Code:", e.getError()), console.log("Fragment Shader Source Dump:"), console.log(t.fragmentSource.split("\n").map((e, t) => `${t + 1}: ${e}`).join("\n")), console.log("FRAGMENT_SHADER_ERROR_END")), e.getProgramParameter(n, e.LINK_STATUS) || (console.log("PROGRAM_LINK_ERROR_START"), console.log("Program linking error: ", e.getProgramInfoLog(n)), console.log("GL Error Code:", e.getError()), console.log("PROGRAM_LINK_ERROR_END")), e.deleteShader(r), e.deleteShader(i), this.glState.program = n, e.useProgram(n);
		let a = e.getUniformLocation(n, "projectionMatrix");
		a && e.uniformMatrix4fv(a, !1, this.glState.camera.projectionMatrix.elements);
		let o = e.getUniformLocation(n, "u_plane_width");
		o && e.uniform1f(o, F);
		let s = e.getUniformLocation(n, "u_plane_height");
		s && e.uniform1f(s, I);
		let c = e.getUniformLocation(n, "u_colors_count");
		c && e.uniform1i(c, L), this.glState.locations.uniforms = {}, this._resolveProgramLocations(e, n, this.glState.locations), this._uniformsDirty = !0, this._colorsChanged = !0, this._textureDirty = !0;
	}
	_buildPattern(e) {
		return b({
			size: e,
			seed: this._textureSeed,
			colors: this._colors,
			colorBlending: this._textureColorBlending,
			baseColor: this._proceduralBackgroundColor || "#000000",
			tile: this._shapeType !== "plane",
			transparentVoid: this._transparentTextureVoid,
			voidLikelihood: this._textureVoidLikelihood,
			voidWidthMin: this._textureVoidWidthMin,
			voidWidthMax: this._textureVoidWidthMax,
			bandDensity: this._textureBandDensity,
			triangles: this._textureShapeTriangles,
			circles: this._textureShapeCircles,
			bars: this._textureShapeBars,
			squiggles: this._textureShapeSquiggles
		});
	}
	_bakeResolution() {
		if (this._textureBakeResolution > 0) return this._textureBakeResolution;
		let e = Math.max(this._ref.width || 0, this._ref.height || 0, 1), t = 2 ** Math.ceil(Math.log2(e * 1.5));
		return Math.min(2048, Math.max(1024, t));
	}
	_startBakeProgram(e) {
		this._bakeProgram || this._pendingBake || (this._pendingBake = this._startProgram(e, M, N(), ["a_pos"]));
	}
	_bakeProgramLinking(e) {
		return this._resolveTextureMode() === "baked" && this._ensureBakePipeline(e) === "linking";
	}
	_ensureBakePipeline(e) {
		if (this._bakeProgram) return "ready";
		this._startBakeProgram(e);
		let t = this._pendingBake;
		if (!this._linked(e, t.program)) return "linking";
		this._pendingBake = null;
		let { program: n, vertex: r, fragment: i } = t, a = !0;
		for (let [n, o] of [[r, t.vertexSource], [i, t.fragmentSource]]) e.getShaderParameter(n, e.COMPILE_STATUS) || (console.log("NEAT_BAKE_SHADER_ERROR_START"), console.log(e.getShaderInfoLog(n)), console.log(o.split("\n").map((e, t) => `${t + 1}: ${e}`).join("\n")), console.log("NEAT_BAKE_SHADER_ERROR_END"), a = !1);
		if (e.deleteShader(r), e.deleteShader(i), !a) return e.deleteProgram(n), "failed";
		if (!e.getProgramParameter(n, e.LINK_STATUS)) return console.log("NEAT_BAKE_LINK_ERROR:", e.getProgramInfoLog(n)), e.deleteProgram(n), "failed";
		this._bakeProgram = n;
		for (let t of [
			"u_neat_shapes",
			"u_neat_aux",
			"u_neat_grid_dim",
			"u_neat_items_row",
			"u_neat_stripes_row",
			"u_neat_stripe_count",
			"u_neat_stripe_lut_row",
			"u_neat_tile",
			"u_neat_bg0",
			"u_neat_bg1",
			"u_neat_base",
			"u_neat_void_alpha",
			"u_neat_edge_softness",
			"u_neat_seam_blend",
			"u_neat_bake_size"
		]) this._bakeUniforms[t] = e.getUniformLocation(n, t);
		let o = e.getParameter(e.VERTEX_ARRAY_BINDING);
		return this._bakeVao = e.createVertexArray(), e.bindVertexArray(this._bakeVao), this._bakeQuad = e.createBuffer(), e.bindBuffer(e.ARRAY_BUFFER, this._bakeQuad), e.bufferData(e.ARRAY_BUFFER, new Float32Array([
			-1,
			-1,
			3,
			-1,
			-1,
			3
		]), e.STATIC_DRAW), e.enableVertexAttribArray(0), e.vertexAttribPointer(0, 2, e.FLOAT, !1, 0, 0), e.bindVertexArray(o), this._bakeFbo = e.createFramebuffer(), "ready";
	}
	_uploadPatternData(e, t) {
		let n = (t, n, r, i) => {
			e.bindTexture(e.TEXTURE_2D, t), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.NEAREST), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.NEAREST), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA32F, n, r, 0, e.RGBA, e.FLOAT, i);
		};
		this._shapeTexture ||= e.createTexture(), this._auxTexture ||= e.createTexture(), e.activeTexture(e.TEXTURE3), n(this._shapeTexture, 5, Math.max(1, t.shapeCount), t.shapes), e.activeTexture(e.TEXTURE4), n(this._auxTexture, 256, t.auxHeight, t.aux);
		let r = this._bakeUniforms;
		e.uniform1i(r.u_neat_shapes, 3), e.uniform1i(r.u_neat_aux, 4), e.uniform1f(r.u_neat_grid_dim, t.gridDim), e.uniform1i(r.u_neat_items_row, t.itemsRow), e.uniform1i(r.u_neat_stripes_row, t.stripesRow), e.uniform1i(r.u_neat_stripe_count, t.stripeCount), e.uniform1i(r.u_neat_stripe_lut_row, t.stripeLutRow), e.uniform1f(r.u_neat_tile, +!!t.tile), e.uniform3fv(r.u_neat_bg0, t.background0), e.uniform3fv(r.u_neat_bg1, t.background1), e.uniform3fv(r.u_neat_base, t.baseColor), e.uniform1f(r.u_neat_void_alpha, t.voidAlpha), e.uniform1f(r.u_neat_edge_softness, this._bakeEdgeSoftness), e.uniform1f(r.u_neat_seam_blend, +!!this._bakeSeamBlend);
	}
	_bakePatternTexture(e) {
		let t = this._buildPattern(1024);
		if (!t || this._ensureBakePipeline(e) !== "ready") return null;
		let n = j(t);
		!this._bakeWarned && n.droppedSquiggles > 0 && (console.warn(`NeatGradient: textureMode 'baked' does not support squiggles (cubic Béziers have no closed-form distance); ${n.droppedSquiggles} dropped. Set textureShapeSquiggles to 0, or use textureMode 'bitmap'.`), this._bakeWarned = !0);
		let r = this._bakeResolution(), i = e.createTexture();
		if (e.activeTexture(e.TEXTURE1), e.bindTexture(e.TEXTURE_2D, i), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA8, r, r, 0, e.RGBA, e.UNSIGNED_BYTE, null), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.REPEAT), e.useProgram(this._bakeProgram), this._uploadPatternData(e, n), e.uniform1f(this._bakeUniforms.u_neat_bake_size, r), e.bindFramebuffer(e.FRAMEBUFFER, this._bakeFbo), e.framebufferTexture2D(e.FRAMEBUFFER, e.COLOR_ATTACHMENT0, e.TEXTURE_2D, i, 0), e.checkFramebufferStatus(e.FRAMEBUFFER) !== e.FRAMEBUFFER_COMPLETE) return e.bindFramebuffer(e.FRAMEBUFFER, null), e.deleteTexture(i), null;
		let a = e.isEnabled(e.BLEND), o = e.isEnabled(e.DEPTH_TEST);
		e.disable(e.BLEND), e.disable(e.DEPTH_TEST), e.viewport(0, 0, r, r);
		let s = e.getParameter(e.VERTEX_ARRAY_BINDING);
		e.bindVertexArray(this._bakeVao), e.drawArrays(e.TRIANGLES, 0, 3), e.bindVertexArray(s), e.bindFramebuffer(e.FRAMEBUFFER, null), a && e.enable(e.BLEND), o && e.enable(e.DEPTH_TEST), e.viewport(0, 0, this._ref.width, this._ref.height), e.activeTexture(e.TEXTURE1), e.bindTexture(e.TEXTURE_2D, i), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR_MIPMAP_LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR), e.generateMipmap(e.TEXTURE_2D);
		let c = e.getExtension("EXT_texture_filter_anisotropic") || e.getExtension("MOZ_EXT_texture_filter_anisotropic") || e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
		if (c) {
			let t = e.getParameter(c.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
			e.texParameterf(e.TEXTURE_2D, c.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, t));
		}
		return this.glState && this.glState.program && e.useProgram(this.glState.program), e.activeTexture(e.TEXTURE0), i;
	}
	_resolveTextureMode() {
		return this._textureMode === "baked" ? this._isWebGL2 ? "baked" : (this._bakeWarned ||= (console.warn("NeatGradient: textureMode 'baked' needs WebGL2 (texelFetch and float textures). Falling back to 'bitmap'."), !0), "bitmap") : "bitmap";
	}
	_createProceduralTexture(e) {
		if (this._activeTextureMode = this._resolveTextureMode(), this._activeTextureMode === "baked") {
			let t = this._bakePatternTexture(e);
			if (t) return t;
			this._activeTextureMode = "bitmap";
		}
		let t = 1024;
		this._sourceCanvas || (this._sourceCanvas = document.createElement("canvas"), this._sourceCanvas.width = t, this._sourceCanvas.height = t, this._sourceCtx = this._sourceCanvas.getContext("2d"));
		let n = this._sourceCanvas, r = this._sourceCtx;
		if (!r) return null;
		this._maskedCanvas || (this._maskedCanvas = document.createElement("canvas"), this._maskedCanvas.width = t, this._maskedCanvas.height = t, this._maskedCtx = this._maskedCanvas.getContext("2d"));
		let i = this._maskedCanvas, a = this._maskedCtx;
		if (!a) return null;
		let o = this._buildPattern(t);
		if (!o) return null;
		x(o, n, r, a);
		let s = e.createTexture();
		e.bindTexture(e.TEXTURE_2D, s), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, e.RGBA, e.UNSIGNED_BYTE, i), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR_MIPMAP_LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR), e.generateMipmap(e.TEXTURE_2D);
		let c = e.getExtension("EXT_texture_filter_anisotropic") || e.getExtension("MOZ_EXT_texture_filter_anisotropic") || e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
		if (c) {
			let t = e.getParameter(c.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
			e.texParameterf(e.TEXTURE_2D, c.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, t));
		}
		return s;
	}
	get fresnelColor() {
		return this._fresnelColor;
	}
	set fresnelColor(e) {
		this._fresnelColor !== e && (this._fresnelColor = e, this._fresnelColorRgb = this._hexToRgb(e), this._uniformsDirty = !0);
	}
	get shapeType() {
		return this._shapeType;
	}
	set shapeType(e) {
		this._shapeType !== e && (this._shapeType = e, this._updateGeometry());
	}
	get cameraLock() {
		return this._cameraLock;
	}
	set cameraLock(e) {
		this._cameraLock = e;
	}
	get cameraZoom() {
		return this._cameraZoom;
	}
	set cameraZoom(e) {
		this._cameraZoom !== e && (this._cameraZoom = e, this._updateCameraFrustum());
	}
	_updateCameraFrustum() {
		if (!this.glState) return;
		let e = this._ref.width, t = this._ref.height;
		o(this.glState.camera, e, t, F, I, this._shapeType, this._cameraZoom), this._uploadProjection(), this._uniformsDirty = !0;
	}
	_startWatermark() {
		if (this._destroyed || this._watermarkProgram) return;
		let e = this.glState.gl, t = e, n = typeof t.createVertexArray == "function", r = this._startProgram(e, V, H, ["a_wm_position", "a_wm_texcoord"]), i = r.program;
		this._watermarkProgram = i, e.deleteShader(r.vertex), e.deleteShader(r.fragment);
		let a = document.createElement("canvas").getContext("2d");
		a.font = "bold 13px -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif";
		let o = a.measureText("NEAT"), s = Math.ceil(o.width) + 12;
		this._watermarkWidth = s, this._watermarkHeight = 23;
		let c = document.createElement("canvas");
		c.width = s, c.height = 23;
		let l = c.getContext("2d");
		l.clearRect(0, 0, s, 23), l.shadowColor = "rgba(0,0,0,0.4)", l.shadowBlur = 2, l.shadowOffsetX = 1, l.shadowOffsetY = 1, l.font = "bold 13px -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif", l.textAlign = "center", l.textBaseline = "middle", l.fillStyle = "rgba(255,255,255,0.5)", l.fillText("NEAT", s / 2, 23 / 2);
		let u = e.createTexture();
		e.activeTexture(e.TEXTURE2), e.bindTexture(e.TEXTURE_2D, u), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR), e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, e.RGBA, e.UNSIGNED_BYTE, c), e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), this._watermarkTexture = u;
		let d = e.createBuffer();
		e.bindBuffer(e.ARRAY_BUFFER, d), e.bufferData(e.ARRAY_BUFFER, new Float32Array([
			0,
			1,
			1,
			1,
			0,
			0,
			1,
			0
		]), e.STATIC_DRAW), this._watermarkTexCoordBuffer = d;
		let f = e.createBuffer();
		e.bindBuffer(e.ARRAY_BUFFER, f), e.bufferData(e.ARRAY_BUFFER, /* @__PURE__ */ new Float32Array(8), e.DYNAMIC_DRAW), this._watermarkBuffer = f, this._wmLocPos = 0, this._wmLocTc = 1, n && (this._watermarkVAO = t.createVertexArray(), t.bindVertexArray(this._watermarkVAO), e.enableVertexAttribArray(this._wmLocPos), e.bindBuffer(e.ARRAY_BUFFER, f), e.vertexAttribPointer(this._wmLocPos, 2, e.FLOAT, !1, 0, 0), e.enableVertexAttribArray(this._wmLocTc), e.bindBuffer(e.ARRAY_BUFFER, d), e.vertexAttribPointer(this._wmLocTc, 2, e.FLOAT, !1, 0, 0), t.bindVertexArray(this._gradientVAO)), this._wmClickHandler = (e) => {
			this._licensed || this._isOverWatermark(e) && (e.preventDefault(), e.stopPropagation(), window.open("https://neat.firecms.co", "_blank", "noopener"));
		}, this._wmMoveHandler = (e) => {
			if (this._licensed) {
				this._currentCursor !== "" && (this._currentCursor = "", this._ref.style.cursor = "", document.body.style.cursor = "");
				return;
			}
			this._wmMoveRafPending || (this._wmMoveRafPending = !0, requestAnimationFrame(() => {
				this._wmMoveRafPending = !1;
				let t = performance.now();
				(!this._wmCachedRect || t - this._wmRectCacheTime > 500) && (this._wmCachedRect = this._ref.getBoundingClientRect(), this._wmRectCacheTime = t);
				let n = this._wmCachedRect, r = e.clientX - n.left, i = e.clientY - n.top, a = n.width, o = n.height, s = "";
				if (r >= 0 && i >= 0 && r <= a && i <= o) {
					let e = this._ref.width ? a / this._ref.width : 1, t = this._watermarkMargin * e, n = this._watermarkWidth * e, c = this._watermarkHeight * e, l = a - t - n, u = o - t - c;
					r >= l && r <= a - t && i >= u && i <= o - t && (s = "pointer");
				}
				this._currentCursor !== s && (this._currentCursor = s, this._ref.style.cursor = s, document.body.style.cursor = s);
			}));
		}, document.addEventListener("click", this._wmClickHandler, !0), document.addEventListener("mousemove", this._wmMoveHandler);
	}
	_isOverWatermark(e) {
		this._wmCachedRect || (this._wmCachedRect = this._ref.getBoundingClientRect(), this._wmRectCacheTime = performance.now());
		let t = this._wmCachedRect, n = e.clientX - t.left, r = e.clientY - t.top, i = t.width, a = t.height;
		if (n < 0 || r < 0 || n > i || r > a) return !1;
		let o = this._ref.width ? i / this._ref.width : 1, s = this._watermarkMargin * o, c = this._watermarkWidth * o, l = this._watermarkHeight * o, u = i - s - c, d = a - s - l;
		return n >= u && n <= i - s && r >= d && r <= a - s;
	}
	_renderWatermark(e) {
		let t = this._watermarkProgram, n = this._watermarkTexture, r = this._watermarkBuffer;
		if (!t || !n || !r) return !0;
		if (!this._wmLinked) {
			if (!this._linked(e, t)) return !1;
			this._wmLocTex = e.getUniformLocation(t, "u_wm_texture"), this._wmLinked = !0;
		}
		let i = this._ref.width, a = this._ref.height;
		if (i === 0 || a === 0) return !0;
		let o = this._watermarkWidth, s = this._watermarkHeight, c = 1 - 4 / i * 2, l = c - o / i * 2, u = -1 + 4 / a * 2, d = u + s / a * 2, f = this._wmPosData;
		f[0] = l, f[1] = u, f[2] = c, f[3] = u, f[4] = l, f[5] = d, f[6] = c, f[7] = d, e.bindBuffer(e.ARRAY_BUFFER, r), e.bufferSubData(e.ARRAY_BUFFER, 0, f);
		let p = e, m = this._watermarkVAO !== null;
		if (e.useProgram(t), e.disable(e.DEPTH_TEST), e.blendFunc(e.ONE, e.ONE_MINUS_SRC_ALPHA), m ? (p.bindVertexArray(this._watermarkVAO), e.bindBuffer(e.ARRAY_BUFFER, r), e.vertexAttribPointer(this._wmLocPos, 2, e.FLOAT, !1, 0, 0)) : (e.enableVertexAttribArray(this._wmLocPos), e.bindBuffer(e.ARRAY_BUFFER, r), e.vertexAttribPointer(this._wmLocPos, 2, e.FLOAT, !1, 0, 0), e.enableVertexAttribArray(this._wmLocTc), e.bindBuffer(e.ARRAY_BUFFER, this._watermarkTexCoordBuffer), e.vertexAttribPointer(this._wmLocTc, 2, e.FLOAT, !1, 0, 0)), e.activeTexture(e.TEXTURE2), e.bindTexture(e.TEXTURE_2D, n), e.uniform1i(this._wmLocTex, 2), e.drawArrays(e.TRIANGLE_STRIP, 0, 4), e.enable(e.DEPTH_TEST), e.blendFunc(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA), e.useProgram(this.glState.program), m) p.bindVertexArray(this._gradientVAO);
		else {
			let t = this.glState.locations.attributes;
			e.enableVertexAttribArray(t.position), e.bindBuffer(e.ARRAY_BUFFER, this.glState.buffers.position), e.vertexAttribPointer(t.position, 3, e.FLOAT, !1, 0, 0), e.enableVertexAttribArray(t.normal), e.bindBuffer(e.ARRAY_BUFFER, this.glState.buffers.normal), e.vertexAttribPointer(t.normal, 3, e.FLOAT, !1, 0, 0), e.enableVertexAttribArray(t.uv), e.bindBuffer(e.ARRAY_BUFFER, this.glState.buffers.uv), e.vertexAttribPointer(t.uv, 2, e.FLOAT, !1, 0, 0), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, this.glState.buffers.index);
		}
		return !0;
	}
};
for (let [e, t, n, r, i] of z) Object.defineProperty(B.prototype, e, {
	get() {
		return n === 1 ? this[t] : this[t] * n;
	},
	set(e) {
		let n = r === 1 ? e : e * r;
		this[t] !== n && (this[t] = n, this._uniformsDirty = !0, i === "t" && this._enableProceduralTexture ? this._textureNeedsUpdate = !0 : i === "g" && this._updateGeometry());
	},
	enumerable: !0,
	configurable: !0
});
function ee() {
	let e = /* @__PURE__ */ new Date(), t = e.getMinutes(), n = e.getSeconds();
	return t * 60 + n;
}
function te() {
	if (document.querySelector("meta[name=\"generator\"][content*=\"NEAT\"]")) return;
	let e = document.createElement("meta");
	e.name = "generator", e.content = "NEAT by FireCMS — https://neat.firecms.co", document.head.appendChild(e);
}
var V = "\nattribute vec2 a_wm_position;\nattribute vec2 a_wm_texcoord;\nvarying vec2 v_wm_texcoord;\nvoid main() {\n    gl_Position = vec4(a_wm_position, 0.0, 1.0);\n    v_wm_texcoord = a_wm_texcoord;\n}\n", H = "\nprecision mediump float;\nvarying vec2 v_wm_texcoord;\nuniform sampler2D u_wm_texture;\nvoid main() {\n    gl_FragColor = texture2D(u_wm_texture, v_wm_texcoord);\n}\n";
//#endregion
export { C as AUX_WIDTH, S as GRID_DIM, B as NeatGradient, M as PATTERN_BAKE_VERT, w as SHAPE_TEXELS, D as SHAPE_TYPE_BAR, O as SHAPE_TYPE_CIRCLE, E as SHAPE_TYPE_TRIANGLE, T as STRIPE_LUT_SIZE, N as buildPatternBakeFrag, j as buildPatternData, b as generatePattern, x as paintPattern };

//# sourceMappingURL=index.es.js.map