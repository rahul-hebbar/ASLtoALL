let clock, scene, camera, renderer;
let mixer, instance, audio;
let video, threeCanvas, canvStream;
let socket;
var animObj = {};

window.addEventListener('load', () => {
	// Initialization
	audio = document.createElement("audio");
	audio.srcObject = window.currentStream;
	audio.play();

	video = document.createElement("video");
	threeCanvas = document.createElement("canvas");
	canvStream = threeCanvas.captureStream(30);
	const WIDTH = 350;
	const HEIGHT = 200;

	// Scene setup
	clock = new THREE.Clock();
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x000000);

	//Lighting setup
	const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
	hemiLight.position.set(0, 10, 0);
	scene.add(hemiLight);
	const dirLight = new THREE.DirectionalLight(0xffffff);
	dirLight.position.set(0, 20, 10);
	scene.add(dirLight);

	//Model initiation
	const loader = new THREE.GLTFLoader();
	loader.load('/glb/fps-hands-small.glb', (gltfObj) => {
		const model = gltfObj.scene;
		scene.add(model);
		const animation = gltfObj.animations;
		mixer = new THREE.AnimationMixer(model);
		mixer.timeScale = 0.2;
		animation.forEach((clip) => {
			const action = mixer.clipAction(clip);
			animObj[clip.name] = action;
			action.clampWhenFinished = true;
			action.loop = THREE.LoopOnce;
		})
		animate();
	});

	// text setup
	instance = new THREE.TextPlane({
		alignment: 'left',
		color: '#24ff00',
		fontFamily: '"Times New Roman", Times, serif',
		fontSize: 0.5,
		fontStyle: 'italic',
		text: ['ASLtoALL', ''].join('\n'),
	});
	instance.position.set(0, 8, 0);
	scene.add(instance);

	//Renderer setup
	renderer = new THREE.WebGLRenderer({ canvas: threeCanvas });
	renderer.setSize(WIDTH, HEIGHT);
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.setPixelRatio(3);

	// camera setup
	camera = new THREE.PerspectiveCamera(35, 2, 0.1, 1000);
	camera.position.set(0, 10.5, 15);

	video.srcObject = canvStream;

	// STT
	const workerOptions = {
		OggOpusEncoderWasmPath: './lib/opus/OggOpusEncoder.wasm',
		WebMOpusEncoderWasmPath: './lib/opus/WebMOpusEncoder.wasm'
	};

	window.MediaRecorder = OpusMediaRecorder;

	const options = {
		mimeType: 'audio/wav',
		audioBitsPerSecond: 256000
	};

	var AudioContext = window.AudioContext || window.webkitAudioContext
	const audioCtx = new AudioContext({ sampleRate: 16000 });

	document.getElementById("pip").onclick = () => {
		video.play().then(() => video.requestPictureInPicture())
		const recorder = new MediaRecorder(window.currentStream, options, workerOptions);
		socket = io.connect('http://localhost:5000');
		socket.on('connect', () => {
			recorder.ondataavailable = (e) => {
				let blob = e.data;
				blob.arrayBuffer().then((buffer) => {
					console.log(buffer)
					audioCtx.decodeAudioData(buffer).then((aud_buffer) => {
						console.log(aud_buffer)
						if (socket.connected) {
							socket.emit('audio_stt', { data: aud_buffer.getChannelData(0) });
							socket.once('stt_text', (resp) => {
								const transcript = resp.text;
								console.log(transcript);
								instance.text = processtext(transcript).join("\n");
								let pr_lis = transcript.replace(/[^a-zA-Z ]/g, "").toUpperCase().split('');
								console.log(pr_lis)
								fullplay(pr_lis);
							});
						}
						else console.log('no server');
					});
				})
			}
			recorder.start(10000);
		});

		video.addEventListener('leavepictureinpicture', (e) => {
			video.pause();
			socket.disconnect();
			recorder.stop();
		});
	}
});

const animate = function () {
	mixer.update(clock.getDelta());
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
};

const processtext = (inp) => {
	let ret_lis = []
	let wor_lis = inp.split(/\s+/);
	let wor_lis_len = wor_lis.length
	let flag_str = ""
	wor_lis.forEach((val, ind) => {
		if (flag_str.length > 80) {
			ret_lis.push(flag_str);
			flag_str = val + " "
		}
		else {
			flag_str = flag_str + val + " ";
			if (ind + 1 === wor_lis_len) ret_lis.push(flag_str);
		}
	});
	if (ret_lis.length === 1) ret_lis.push("");
	return ret_lis;
}

window.addEventListener('beforeunload', () => {
	if (socket !== null) {
		if (socket.connected) socket.disconnect();
	}
	canvStream.getTracks().forEach((track) => {
		track.stop();
	})
	window.currentStream.getTracks().forEach((track) => {
		track.stop();
	})
	audio.srcObject = null;
	video.srcObject = null;
	window.currentStream = null;
	window.close();
});

function fullplay(lis) {
	let len = lis.length;
	console.log(len)
	let i = 0;
	play(i);
	function play(ind){
		var n;
		if (lis[ind] === " "){
			n = "idle"
		}
		else {
			n = lis[ind]
		}
		const action = animObj[n]
		action.play();
		const y = ind+1;
		mixer.addEventListener('finished',() => {
			console.log(y)
			if (y === len){
				console.log('finish')
				return true;
			}
			else {
				action.fadeOut(0)
				play(y);
			}
		})
	}
}