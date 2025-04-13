class Game{
	constructor(){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

		this.modes = Object.freeze({
			NONE:   Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING:  Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			GAMEOVER: Symbol("gameover")
		});
		this.mode = this.modes.NONE;
		
		
		this.container;
		this.player;
		this.cameras;
		this.camera;
		this.scene;
		this.renderer;
		this.animations = {};
		this.assetsPath = 'assets/';
		
		this.remotePlayers = [];
		this.remoteColliders = [];
		this.initialisingPlayers = [];
		this.remoteData = [];
		
		this.messages = { 
			text:[ 
			"Welcome",
			"GOOD LUCK!"
			],
			index:0
		}
		
		this.container = document.createElement( 'div' );
		this.container.style.height = '100%';
		document.body.appendChild( this.container );
		
		const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
        this.initSfx();
		const game = this;
		 // 动画路径格式
        this.anims = [
            'Idle.fbx',
            'Walking.fbx', 
            'Walking Backwards.fbx',
            'Turn.fbx', 
            'Running.fbx',
            'Northern Soul Spin Combo.fbx',
            'Talking.fbx',
            'Slide Hip Hop Dance.fbx',
			'Breakdance Freezes.fbx',
			'Gangnam Style.fbx',
			'Northern Soul Floor Combo.fbx'
        ];
		
		const options = {
			assets:[
				`${this.assetsPath}images/nx.jpg`,
				`${this.assetsPath}images/px.jpg`,
				`${this.assetsPath}images/ny.jpg`,
				`${this.assetsPath}images/py.jpg`,
				`${this.assetsPath}images/nz.jpg`,
				`${this.assetsPath}images/pz.jpg`
			],
			oncomplete: function(){
				game.init();
			}
		}
		
		// 动画路径
        this.anims.forEach(function(anim){ 
            options.assets.push(`${game.assetsPath}fbx/anims/${anim}`);
            console.log(`Added animation to load: ${anim}`);
        });
		options.assets.push(`${game.assetsPath}fbx/town.fbx`);
		
		this.mode = this.modes.PRELOAD;
		
		this.clock = new THREE.Clock();

		const preloader = new Preloader(options);
		
		window.onError = function(error){
			console.error(JSON.stringify(error));
		}

		// 音频调试信息
		window.addEventListener('DOMContentLoaded', () => {
			console.log('Audio context state:', this.sfx?.context?.state);
			console.log('Background music loaded:', !!this.sfx?.background);
			console.log('Footsteps sound loaded:', !!this.sfx?.footsteps);
		});


		// 键盘事件监听
		window.addEventListener('keydown', (event) => {
			switch(event.key.toLowerCase()) {
				case 'q':  
					if(this.player) this.player.action = 'Northern Soul Spin Combo';
					break;
				case 'w':  
					if(this.player) this.player.action = 'Slide Hip Hop Dance';
					break;
				case 'e':  
					if(this.player) this.player.action = 'Breakdance Freezes';
					break;
				case 'r':  
					if(this.player) this.player.action = 'Gangnam Style';
					break;
				case 't':  
					if(this.player) this.player.action = 'Northern Soul Floor Combo';
					break;
			}
		});

		// 动作结束后自动回到 Idle 状态
		window.addEventListener('keyup', (event) => {
			if((event.key.toLowerCase() === 'p' || event.key.toLowerCase() === 'g') && this.player) {
				setTimeout(() => {
					this.player.action = 'Idle';
				}, 1000); // 1秒后回到待机状态
			}
		});

		this.kunai = null;  // 存储苦无对象
		this.kunaiPosition = null;  // 存储苦无位置
	}
	
	initSfx(){
		this.sfx = {};
		this.sfx.context = new (window.AudioContext || window.webkitAudioContext)();
		
		 // 音乐播放状态标志
		this.musicPlaying = false;

		// 背景音效
		this.sfx.background = new SFX({
			context: this.sfx.context,
			src:{mp3:`${this.assetsPath}sfx/background.mp3`, ogg:`${this.assetsPath}sfx/background.ogg`},
			loop: true,
			volume: 0.1,
			autoplay: true
		});
	
		// 脚步声音效
		this.sfx.footsteps = new SFX({
			context: this.sfx.context,
			src:{mp3:`${this.assetsPath}sfx/footsteps.mp3`},
			loop: true,  // 循环播放
			volume: 0.5  // 音量
		});

		// 语音效果
		this.sfx.voices = {
			gomina: new SFX({
				context: this.sfx.context,
				src:{mp3:`${this.assetsPath}sfx/gomina.wav`},
				loop: false,
				volume: 0.5
			}),
			itachi: new SFX({
				context: this.sfx.context,
				src:{mp3:`${this.assetsPath}sfx/itachi.wav`},
				loop: false,
				volume: 0.5
			}),
			nani: new SFX({
				context: this.sfx.context,
				src:{mp3:`${this.assetsPath}sfx/nani.wav`},
				loop: false,
				volume: 0.5
			}),
			oioi: new SFX({
				context: this.sfx.context,
				src:{mp3:`${this.assetsPath}sfx/oioi.wav`},
				loop: false,
				volume: 0.5
			}),
			xie: new SFX({
				context: this.sfx.context,
				src:{mp3:`${this.assetsPath}sfx/xie.wav`},
				loop: false,
				volume: 0.5
			})
		};

		// 苦无拾取音效
		this.sfx.getKunai = new SFX({
			context: this.sfx.context,
			src: {mp3: `${this.assetsPath}sfx/get.mp3`},
			loop: false,
			volume: 0.5
		});
	}
	
	set activeCamera(object){
		this.cameras.active = object;
	}
	
	init() {
		this.mode = this.modes.INITIALISING;

		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 10, 200000 );
		
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0x00a0f0 );

		// 环境光和平行光
		const ambient = new THREE.AmbientLight(0xaaaaaa, 0.7); // 环境光强度
		this.scene.add(ambient);

		const light = new THREE.DirectionalLight(0xFFFFFF, 2); // 增加光照强度
		light.position.set(100, 200, 50); // 光源位置
		light.target.position.set(0, 0, 0);

		// 阴影贴图大小和质量
		light.castShadow = true;
		light.shadow.mapSize.width = 4096;
		light.shadow.mapSize.height = 4096;
		light.shadow.camera.near = 1;
		light.shadow.camera.far = 3000;
		light.shadow.camera.left = -1500;
		light.shadow.camera.right = 1500;
		light.shadow.camera.top = 1500;
		light.shadow.camera.bottom = -1500;
		light.shadow.bias = -0.0001;

		this.sun = light;
		this.scene.add(light);

		// model
		const loader = new THREE.FBXLoader();
		const game = this;
		
		this.player = new PlayerLocal(this);
		
		this.loadEnvironment(loader);
		this.loadKunai();//苦无
		
		this.speechBubble = new SpeechBubble(this, "", 150);
		this.speechBubble.mesh.position.set(0, 350, 0);
		
		this.joystick = new JoyStick({
			onMove: this.playerControl,
			game: this
		});
		
		// 渲染器设置
		this.renderer = new THREE.WebGLRenderer({ 
			antialias: true,
			powerPreference: "high-performance"
		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		this.renderer.gammaFactor = 2.2;
		this.renderer.physicallyCorrectLights = true;
		this.container.appendChild( this.renderer.domElement );
		
		if ('ontouchstart' in window){
			window.addEventListener( 'touchdown', (event) => game.onMouseDown(event), false );
		}else{
			window.addEventListener( 'mousedown', (event) => game.onMouseDown(event), false );	
		}
		
		window.addEventListener( 'resize', () => game.onWindowResize(), false );

		if(this.sfx && this.sfx.background && !this.musicPlaying) {
			const startAudio = () => {
				if(!this.musicPlaying) {
					this.sfx.context.resume().then(() => {
						this.sfx.background.play();
						this.musicPlaying = true;
					});
				}
				document.removeEventListener('click', startAudio);
				document.removeEventListener('touchstart', startAudio);
			};
			
			document.addEventListener('click', startAudio, { once: true });
			document.addEventListener('touchstart', startAudio, { once: true });
		}

	}
	
	loadEnvironment(loader){
		const game = this;
		loader.load(`${this.assetsPath}fbx/town.fbx`, function(object){
			game.environment = object;
			game.colliders = [];
			game.scene.add(object);
			object.traverse(function(child){
				if(child.isMesh){
					if(child.name.startsWith("proxy")){
						game.colliders.push(child);
						child.material.visible = false;
					}else{
						// 地面
						if(child.name.toLowerCase().includes('ground') || 
						   child.name.toLowerCase().includes('floor')){
							child.receiveShadow = true;
							child.castShadow = false;
							// 地面材质处理阴影
							if(child.material){
								child.material.shadowSide = THREE.FrontSide;
								child.material.needsUpdate = true;
							}
						}else{
							child.castShadow = true;
							child.receiveShadow = true;
						}
					}
				}
			});
			
			const tloader = new THREE.CubeTextureLoader();
			tloader.setPath( `${game.assetsPath}/images/` );

			var textureCube = tloader.load( [
				'px.jpg', 'nx.jpg',
				'py.jpg', 'ny.jpg',
				'pz.jpg', 'nz.jpg'
			] );

			game.scene.background = textureCube;
			
			game.loadNextAnim(loader);
		})
	}

	loadNextAnim(loader){
		let anim = this.anims.pop();
		const game = this;
		
		console.log(`Loading animation: ${anim}`);
		
		loader.load( `${this.assetsPath}fbx/anims/${anim}`, function( object ){
			console.log(`Successfully loaded animation: ${anim}`);
			
			if(object.animations && object.animations.length > 0){
				const animName = anim.replace('.fbx','');
				game.animations[animName] = object.animations[0];
				
				if(game.player){
					game.player.animations[animName] = object.animations[0];
				}
				console.log(`Added animation ${animName} to game and player`);
			}

			if (game.anims.length>0){
				game.loadNextAnim(loader);
			}else{
				delete game.anims;
				if(game.player) {
					game.player.action = "Idle";
				}
				game.mode = game.modes.ACTIVE;
				game.animate();
			}
			}, 
			// 加载进度回调
			function(xhr){
				console.log(`${anim} ${(xhr.loaded/xhr.total*100).toFixed(0)}%`);
			},
			// 错误回调
			function(error){
				console.error(`Error loading animation ${anim}:`, error);
			});
	}
	
	playerControl(forward, turn){
		turn = -turn;
		
		if (forward>0.3){
			if (this.player.action!='Walking' && this.player.action!='Running') this.player.action = 'Walking';
		}else if (forward<-0.3){
			if (this.player.action!='Walking Backwards') this.player.action = 'Walking Backwards';
		}else{
			forward = 0;
			if (Math.abs(turn)>0.1){
				if (this.player.action != 'Turn') this.player.action = 'Turn';
			}else if (this.player.action!="Idle"){
				this.player.action = 'Idle';
			}
		}
		
		if (forward==0 && turn==0){
			delete this.player.motion;
		}else{
			this.player.motion = { forward, turn }; 
		}
		
		this.player.updateSocket();
	}
	
	createCameras(){
		//摄像机高度
		const offset = new THREE.Vector3(0, 80, 0);
		const front = new THREE.Object3D();
		front.position.set(112, 100, 600);
		front.parent = this.player.object;
		const back = new THREE.Object3D();
		back.position.set(0, 300, -1050);
		back.parent = this.player.object;
		const chat = new THREE.Object3D();
		chat.position.set(0, 200, -450);
		chat.parent = this.player.object;
		const wide = new THREE.Object3D();
		wide.position.set(178, 139, 1665);
		wide.parent = this.player.object;
		const overhead = new THREE.Object3D();
		overhead.position.set(0, 400, 0);
		overhead.parent = this.player.object;
		const collect = new THREE.Object3D();
		collect.position.set(40, 82, 94);
		collect.parent = this.player.object;
		this.cameras = { front, back, wide, overhead, collect, chat };
		this.activeCamera = this.cameras.back;	
	}
	
	showMessage(msg, fontSize=20, onOK=null){
		const txt = document.getElementById('message_text');
		txt.innerHTML = msg;
		txt.style.fontSize = fontSize + 'px';
		const btn = document.getElementById('message_ok');
		const panel = document.getElementById('message');
		const game = this;
		if (onOK!=null){
			btn.onclick = function(){ 
				panel.style.display = 'none';
				onOK.call(game); 
			}
		}else{
			btn.onclick = function(){
				panel.style.display = 'none';
			}
		}
		panel.style.display = 'flex';
	}
	
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( window.innerWidth, window.innerHeight );

	}
	
	updateRemotePlayers(dt) {
    if (!this.remoteData || this.remoteData.length === 0) return;
    
    this.remoteData.forEach(data => {
        if (data.id !== this.player.id) {
            let player = this.remotePlayers.find(p => p.id === data.id);
            
            if (player === undefined) {
                console.log(`Creating new remote player: ${data.id}`);
                player = new Player(this, {
                    id: data.id,
                    model: data.model,
                    colour: data.colour,
                    x: data.x,
                    y: data.y,
                    z: data.z,
                    h: data.heading,
                    pb: data.pb
                });
                
                // 确保新玩家有完整的动画集
                if (this.animations) {
                    Object.keys(this.animations).forEach(animName => {
                        player.animations[animName] = this.animations[animName];
                    });
                }
                
                // 创建碰撞体
                const geometry = new THREE.BoxGeometry(100, 300, 100);
                const material = new THREE.MeshBasicMaterial({visible: false});
                const box = new THREE.Mesh(geometry, material);
                box.name = "Collider";
                box.position.set(0, 150, 0);
                player.object.add(box);
                player.collider = box;
                this.remoteColliders.push(box);
                
                this.remotePlayers.push(player);
                console.log(`Added remote player ${data.id} with animations:`, Object.keys(player.animations));
            } else {
                // 更新现有远程玩家
                player.object.position.lerp(new THREE.Vector3(data.x, data.y, data.z), 0.2);
                player.object.rotation.set(data.pb || 0, data.heading || 0, 0);

                // 更新动画
                if (player.action !== data.action && data.action) {
                    console.log(`Updating remote player ${data.id} action to ${data.action}`);
                    player.action = data.action;
                }
				// 更新动画状态
                if (data.action && data.action !== player.action) {
                    player.action = data.action;  // 设置动作
                }

                // 确保动画更新
                if (player.mixer) {
                    player.mixer.update(dt);
                }
            }
        }
    });
}
	
	onMouseDown( event ) {
		if (this.remoteColliders===undefined || this.remoteColliders.length==0 || this.speechBubble===undefined || this.speechBubble.mesh===undefined) return;
		
		// calculate mouse position in normalized device coordinates
		const mouse = new THREE.Vector2();
		mouse.x = ( event.clientX / this.renderer.domElement.clientWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / this.renderer.domElement.clientHeight ) * 2 + 1;

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera( mouse, this.camera );
		
		const intersects = raycaster.intersectObjects( this.remoteColliders );
		const chat = document.getElementById('chat');
		
		if (intersects.length>0){
			const object = intersects[0].object;
			const players = this.remotePlayers.filter( function(player){
				if (player.collider!==undefined && player.collider==object){
					return true;
				}
			});
			if (players.length>0){
				const player = players[0];
				console.log(`onMouseDown: player ${player.id}`);
				
				// 添加随机语音播放
				if(this.sfx && this.sfx.voices) {
					const voices = Object.keys(this.sfx.voices);
					const randomVoice = voices[Math.floor(Math.random() * voices.length)];
					this.sfx.voices[randomVoice].play();
				}
				
				this.speechBubble.player = player;
				this.speechBubble.update('');
				this.scene.add(this.speechBubble.mesh);
				this.chatSocketId = player.id;
				chat.style.bottom = '0px';
				this.activeCamera = this.cameras.chat;
			}
		} else {
			//Is the chat panel visible?
			if (chat.style.bottom=='0px' && (window.innerHeight - event.clientY)>40){
				console.log("onMouseDown: No player found");
				if (this.speechBubble.mesh.parent!==null) this.speechBubble.mesh.parent.remove(this.speechBubble.mesh);
				delete this.speechBubble.player;
				delete this.chatSocketId;
				chat.style.bottom = '-50px';
				this.activeCamera = this.cameras.back;
			}else{
				console.log("onMouseDown: typing");
			}
		}
	}
	
	getRemotePlayerById(id){
		if (this.remotePlayers===undefined || this.remotePlayers.length==0) return;
		
		const players = this.remotePlayers.filter(function(player){
			if (player.id == id) return true;
		});	
		
		if (players.length==0) return;
		
		return players[0];
	}
	
	animate() {
		const game = this;
		const dt = this.clock.getDelta();
		
		requestAnimationFrame( function(){ game.animate(); } );
		
		this.updateRemotePlayers(dt);
		
		// 在活动状态下更新动画
		if (this.player && this.player.mixer && this.mode == this.modes.ACTIVE) {
			this.player.mixer.update(dt);
		}
		
		if (this.player.action=='Walking'){
			const elapsedTime = Date.now() - this.player.actionTime;
			if (elapsedTime>1000 && this.player.motion.forward>0){
				this.player.action = 'Running';
			}
		}
		
		if (this.player.motion !== undefined) this.player.move(dt);
		this.checkKunaiPickup();//苦无

		if (this.cameras!=undefined && this.cameras.active!=undefined && this.player!==undefined && this.player.object!==undefined){
			this.camera.position.lerp(this.cameras.active.getWorldPosition(new THREE.Vector3()), 0.05);
			const pos = this.player.object.position.clone();
			if (this.cameras.active==this.cameras.chat){
				pos.y += 200;
			}else{
				pos.y += 300;
			}
			this.camera.lookAt(pos);
		}
		
		if (this.sun !== undefined){
			this.sun.position.copy( this.camera.position );
			this.sun.position.y += 10;
		}
		
		if (this.speechBubble!==undefined) this.speechBubble.show(this.camera.position);

		this.checkKunaiPickup();
		
		// 添加苦无旋转动画
		if (this.kunai) {
			this.kunai.rotation.y += 0.05; // 缓慢旋转
		}

		// 更新位置信息显示
		const debugInfo = document.getElementById('debugInfo');
		if (debugInfo && this.kunai && this.player && this.player.object) {
			const distance = this.player.object.position.distanceTo(this.kunai.position);
			debugInfo.innerHTML = `
				<div style="font-weight: bold;">distance: ${distance.toFixed(0)} m</div>
			`;
		}

		this.renderer.render( this.scene, this.camera );
	}

	removePlayer(player) {
        if(player.local) return;
        
        console.log(`Removing player ${player.id}`);
        
        const index = this.remotePlayers.indexOf(player);
        if(index !== -1) {
            this.remotePlayers.splice(index, 1);
            this.scene.remove(player.object);
        }
    }

	loadKunai() {
        const loader = new THREE.FBXLoader();
        const textureLoader = new THREE.TextureLoader();
        const game = this;

        // 创建调试信息显示器
        const debugInfo = document.createElement('div');
        debugInfo.id = 'debugInfo';
        debugInfo.style.position = 'fixed';
        debugInfo.style.top = '10px';
        debugInfo.style.right = '10px';
        debugInfo.style.backgroundColor = 'rgba(0,0,0,0.6)';
        debugInfo.style.color = 'white';
        debugInfo.style.padding = '15px';
        debugInfo.style.fontFamily = 'Arial, sans-serif';
        debugInfo.style.fontSize = '20px';  // 字体大小
        debugInfo.style.borderRadius = '5px';
        debugInfo.style.minWidth = '150px';
        debugInfo.style.zIndex = '1000';
        document.body.appendChild(debugInfo);

        console.log("Loading Kunai model...");
        loader.load(`${this.assetsPath}fbx/anims/KunaiKnife.fbx`, function(object) {
            console.log("Kunai model loaded");
            textureLoader.load(`${game.assetsPath}images/wood-079_alder-red-1_d.jpg`, function(texture) {
                object.traverse(function(child) {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            map: texture,
                            metalness: 0.7,
                            roughness: 0.3
                        });
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                game.kunai = object;
                game.kunai.scale.set(1, 1, 1);
                game.kunai.position.y = 100;

                // 确保在添加到场景之前设置位置
                const playerPos = game.player.object.position;
                const radius = 500;
                const angle = Math.random() * Math.PI * 2;
                const x = playerPos.x + Math.cos(angle) * radius;
                const z = playerPos.z + Math.sin(angle) * radius;
                game.kunai.position.set(x, 100, z);

                game.scene.add(game.kunai);
                game.kunaiPosition = game.kunai.position.clone();
                
                console.log("Kunai spawned at:", {
                    x: game.kunai.position.x,
                    y: game.kunai.position.y,
                    z: game.kunai.position.z
                });
            });
        });
    }

    respawnKunai() {
        if (!this.kunai) return;

        // 在玩家附近随机生成位置
        const playerPos = this.player.object.position;
        const radius = 500; // 在玩家500单位范围内生成
        const angle = Math.random() * Math.PI * 2;
        
        const x = playerPos.x + Math.cos(angle) * radius;
        const z = playerPos.z + Math.sin(angle) * radius;
        const y = 100;  // 固定高度

        this.kunai.position.set(x, y, z);
        this.kunai.rotation.y = Math.random() * Math.PI * 2;
        
        if (!this.kunai.parent) {
            this.scene.add(this.kunai);
        }
        
        this.kunaiPosition = new THREE.Vector3(x, y, z);
        console.log("Kunai spawned at:", {x, y, z});
    }

    checkKunaiPickup() {
		if (!this.kunai || !this.player || !this.kunaiPosition) return;
	
		const distance = this.player.object.position.distanceTo(this.kunaiPosition);
		if (distance < 200) {
			// 播放拾取音效
			if (this.sfx && this.sfx.getKunai) {
				this.sfx.getKunai.play();
			}
	
			// 显示胜利消息
			this.showMessage("Congratulations！You find Kunai!", 30);
	
			// 在玩家周围2000范围内随机重生苦无
			setTimeout(() => {
				const playerPos = this.player.object.position;
				const radius = 3000; // 刷新范围
				const angle = Math.random() * Math.PI * 2;
				
				// 以玩家为中心计算新位置
				const x = playerPos.x + Math.cos(angle) * radius;
				const z = playerPos.z + Math.sin(angle) * radius;
				const y = 0;  // 保持苦无的高度不变
	
				this.kunai.position.set(x, y, z);
				this.kunai.rotation.y = Math.random() * Math.PI * 2;
				this.kunaiPosition = this.kunai.position.clone();
	
				console.log("Kunai respawned at:", {
					x: x,
					y: y,
					z: z,
					playerPos: {
						x: playerPos.x,
						y: playerPos.y,
						z: playerPos.z
					},
					distance: this.kunaiPosition.distanceTo(playerPos)
				});
			}, 1000); // 1秒后重生
		}
	}
}

class Player {
    constructor(game, options) {
        this.local = true;
        this.game = game;
        this.animations = {};

        // 创建父对象
        this.object = new THREE.Object3D();
        this.object.position.set(3122, 0, -173);
        this.object.rotation.set(0, 2.6, 0);
        game.scene.add(this.object);

        let model;
        if (options === undefined) {
            model = 'shishui';
        } else if (typeof options == 'object') {
            this.local = false;
            this.options = options;
            this.id = options.id;
            model = options.model;
            
            // 立即设置初始位置
            this.object.position.set(options.x, options.y, options.z);
            this.object.rotation.set(options.pb || 0, options.heading || 0, 0);
        } else {
            model = options;
        }
        this.model = model;

        const loader = new THREE.FBXLoader();
        const player = this;

        // 模型加载部分
        loader.load(`${game.assetsPath}fbx/anims/shishui.fbx`, function(object) {
            console.log('Model loaded:', object);

            // 动画
            object.mixer = new THREE.AnimationMixer(object);
            player.root = object;
            player.mixer = object.mixer;

            // 加载贴图
            const textureLoader = new THREE.TextureLoader();
            Promise.all([
                new Promise((resolve) => {
                    textureLoader.load(`${game.assetsPath}images/nt000.png`, 
                        (texture) => {
                            // 纹理参数
                            texture.flipY = false;
                            texture.encoding = THREE.sRGBEncoding;
                            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                            texture.repeat.set(1, -1);  
                            texture.offset.set(0, 1);   
                            texture.anisotropy = 16;  
                            resolve(texture);
                        }
                    );
                }),
                new Promise((resolve) => {
                    textureLoader.load(`${game.assetsPath}images/nt004.png`,
                        (texture) => {
                            texture.flipY = false;
                            texture.encoding = THREE.sRGBEncoding;
                            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                            texture.repeat.set(1, -1);
                            texture.offset.set(0, 1);
                            texture.anisotropy = 16;
                            resolve(texture);
                        }
                    );
                })
            ]).then(([texture1, texture2]) => {
                object.traverse(function(child) {
                    if (child.isMesh) {
                        console.log('处理网格:', child.name);
                        
                        const isEye = child.name.includes('eye');
                        
                        const material = new THREE.MeshPhongMaterial({
                            map: isEye ? texture2 : texture1,
                            color: 0xffffff,
                            emissive: isEye ? new THREE.Color(0xFF0000) : 0x000000,
                            emissiveIntensity: isEye ? 0.3 : 0,
                            specular: isEye ? 0xFFFFFF : 0x111111,
                            shininess: isEye ? 100 : 30,
                            skinning: true,           
                            side: THREE.FrontSide,    
                            transparent: true,
                            alphaTest: 0.5,
                            shadowSide: THREE.BackSide
                        });

                        child.material = material;
                        child.material.needsUpdate = true;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // 人物初始位置
                player.object.position.y = 0; // 确保人物在地面上

                // 模型比例大小和位置
                object.scale.set(1.5, 1.5, 1.5);
                object.position.set(0, -20, 0); // 稍微下移一点避免浮空

                // 添加到场景
                player.object.add(object);
                console.log('Model added to scene');

                // 动画
                if (game.animations) {
                    for(let animName in game.animations) {
                        player.animations[animName] = game.animations[animName];
                        console.log(`Added animation: ${animName}`);
                    }
                }

                // 设置初始动作
                if (player.animations["Idle"]) {
                    console.log('Setting initial Idle animation');
                    player.action = "Idle";
                }

                // 本地玩家设置摄像机
                if (player.local) {
                    game.createCameras();
                    game.sun.target = game.player.object;
                    if (player.initSocket !== undefined) player.initSocket();
                }
            });
        });
    }
    
    // 打印动画状态
    debugAnimation() {
        console.log('Current action:', this.actionName);
        console.log('Available animations:', Object.keys(this.animations));
        console.log('Mixer:', this.mixer);
        if(this.mixer) {
            console.log('Active actions:', this.mixer._actions);
        }
    }
    
    set action(name){
        // 调试
        console.log(`Setting action ${name} for player ${this.id || 'local'}`);
        console.log('Available animations:', Object.keys(this.animations));

        if(this.actionName == name) return;

        const clip = this.animations[name];
        if(!clip) {
            console.warn(`Animation ${name} not found for player ${this.id || 'local'}`);
            return;
        }

		// 处理脚步声
		if(this.game.sfx && this.local){
			if(name === 'Running' || name === 'Walking'){
				if(!this.footstepsPlaying){
					this.game.sfx.footsteps.play();
					this.footstepsPlaying = true;
					// 音量和播放速度
					if(name === 'Running') {
						this.game.sfx.footsteps.volume = 0.7;
					} else {
						this.game.sfx.footsteps.volume = 0.5;
					}
				}
			} else {
				if(this.footstepsPlaying){
					this.game.sfx.footsteps.stop();
					this.footstepsPlaying = false;
				}
			}
		 }

        // 动作的语音
        if(this.game.sfx && this.local){
            if(name === 'Northern Soul Spin Combo' || name === 'Slide Hip Hop Dance'|| name === 'Breakdance Freezes'|| name === 'Gangnam Style'|| name === 'Northern Soul Floor Combo'){
                const voices = Object.keys(this.game.sfx.voices);
                // 随机选择一个语音
                const randomVoice = voices[Math.floor(Math.random() * voices.length)];
                this.game.sfx.voices[randomVoice].play();
            }
        }

        if(this.mixer) {
            const action = this.mixer.clipAction(clip);
            
            if(this.actionName) {
                const oldAction = this.mixer.clipAction(this.animations[this.actionName]);
                oldAction.fadeOut(0.2);
                action.reset()
                     .setEffectiveTimeScale(1)
                     .setEffectiveWeight(1)
                     .fadeIn(0.2)
                     .play();
            } else {
                action.play();
            }
            
            this.actionName = name;
            this.actionTime = Date.now();

            if(this.local) {
                this.updateSocket();
            }
        }
    }
    
    get action(){
        return this.actionName;
    }
    
    update(dt) {
        if (this.mixer) {
            this.mixer.update(dt);
        }

        if (!this.local && this.object) {
            const data = this.game.remoteData.find(data => data.id === this.id);
            if (data) {
                // 平滑插值位置
                const targetPosition = new THREE.Vector3(
                    data.x,
                    data.y,
                    data.z
                );
                this.object.position.lerp(targetPosition, 0.2);

                // 创建目标旋转矩阵
                const targetRotation = new THREE.Matrix4();
                targetRotation.makeRotationY(data.h || 0);  // 先应用Y轴旋转(heading)
                
                // 转换为四元数进行平滑插值
                const targetQuaternion = new THREE.Quaternion();
                targetQuaternion.setFromRotationMatrix(targetRotation);
                
                // 使用slerp进行平滑插值
                this.object.quaternion.slerp(targetQuaternion, 0.2);

                // 更新动画状态
                if (this.action !== data.action && data.action) {
                    console.log(`Updating remote player ${this.id} animation to ${data.action}`);
                    this.action = data.action;
                }
            }
        }
    }

    move(dt){
        const pos = this.object.position.clone();
        pos.y += 60;
        
        let dir = new THREE.Vector3();
        let raycaster = new THREE.Raycaster();
        let blocked = false;
        
        // 前方碰撞检测
        this.object.getWorldDirection(dir);
        if (this.motion.forward < 0) dir.negate();
        raycaster.set(pos, dir);

        // 检测与其他玩家的碰撞
        if (this.game.remoteColliders && this.game.remoteColliders.length > 0) {
            const playerCollisions = raycaster.intersectObjects(this.game.remoteColliders);
            if (playerCollisions.length > 0 && playerCollisions[0].distance < 50) {
                console.log("Player collision detected!");
                blocked = true;
            }
        }

        // 检测与环境的碰撞
        if (!blocked && this.game.colliders) {
            const envCollisions = raycaster.intersectObjects(this.game.colliders);
            if (envCollisions.length > 0 && envCollisions[0].distance < 50) {
                console.log("Environment collision detected!");
                blocked = true;
            }
        }

        // 移动处理
        if (!blocked){
            if (this.motion.forward > 0){
                const speed = (this.action == 'Running') ? 500 : 150;
                this.object.translateZ(dt * speed);
            }else{
                this.object.translateZ(-dt * 30);
            }
        }

        // 左右碰撞检测
        if (this.game.remoteColliders || this.game.colliders) {
            // 左侧检测
            dir.set(-1, 0, 0);
            dir.applyMatrix4(this.object.matrix);
            dir.normalize();
            raycaster.set(pos, dir);

            let leftCollisions = [];
            if (this.game.colliders) {
                leftCollisions = leftCollisions.concat(raycaster.intersectObjects(this.game.colliders));
            }
            if (this.game.remoteColliders) {
                leftCollisions = leftCollisions.concat(raycaster.intersectObjects(this.game.remoteColliders));
            }

            if (leftCollisions.length > 0 && leftCollisions[0].distance < 50) {
                this.object.translateX(50 - leftCollisions[0].distance);
            }

            // 右侧检测
            dir.set(1, 0, 0);
            dir.applyMatrix4(this.object.matrix);
            dir.normalize();
            raycaster.set(pos, dir);

            let rightCollisions = [];
            if (this.game.colliders) {
                rightCollisions = rightCollisions.concat(raycaster.intersectObjects(this.game.colliders));
            }
            if (this.game.remoteColliders) {
                rightCollisions = rightCollisions.concat(raycaster.intersectObjects(this.game.remoteColliders));
            }

            if (rightCollisions.length > 0 && rightCollisions[0].distance < 50) {
                this.object.translateX(-(50 - rightCollisions[0].distance));
            }
        }


        dir.set(0, -1, 0);
        pos.y += 50;
        raycaster.set(pos, dir);
        const gravity = 30;

        let groundCollisions = [];
        if (this.game.colliders) {
            groundCollisions = raycaster.intersectObjects(this.game.colliders);
        }

        if (groundCollisions.length > 0) {
            const targetY = pos.y - groundCollisions[0].distance;
            if (targetY > this.object.position.y) {
                this.object.position.y = 0.8 * this.object.position.y + 0.2 * targetY;
                this.velocityY = 0;
            } else if (targetY < this.object.position.y) {
                if (this.velocityY === undefined) this.velocityY = 0;
                this.velocityY += dt * gravity;
                this.object.position.y -= this.velocityY;
                if (this.object.position.y < targetY) {
                    this.velocityY = 0;
                    this.object.position.y = targetY;
                }
            }
        }

        this.object.rotateY(this.motion.turn * dt);
        this.updateSocket();
    }
}

class PlayerLocal extends Player{
	constructor(game, model){
		super(game, model);
		
		const player = this;
		const socket = io.connect();
		socket.on('setId', function(data){
			player.id = data.id;
		});
		socket.on('remoteData', function(data){
			game.remoteData = data;
		});
		socket.on('deletePlayer', function(data){
			const players = game.remotePlayers.filter(function(player){
				if (player.id == data.id){
					return player;
				}
			});
			if (players.length>0){
				let index = game.remotePlayers.indexOf(players[0]);
				if (index!=-1){
					game.remotePlayers.splice( index, 1 );
					game.scene.remove(players[0].object);
				}
            }else{
                index = game.initialisingPlayers.indexOf(data.id);
                if (index!=-1){
                    const player = game.initialisingPlayers[index];
                    player.deleted = true;
                    game.initialisingPlayers.splice(index, 1);
                }
			}
		});
        
		socket.on('chat message', function(data){
			document.getElementById('chat').style.bottom = '0px';
			const player = game.getRemotePlayerById(data.id);
			game.speechBubble.player = player;
			game.chatSocketId = player.id;
			game.activeCamera = game.cameras.chat;
			game.speechBubble.update(data.message);
		});
        
		$('#msg-form').submit(function(e){
			socket.emit('chat message', { id:game.chatSocketId, message:$('#m').val() });
			$('#m').val('');
			return false;
		});
		
		this.socket = socket;
	}
	
	initSocket(){
        console.log("Initializing socket for player");
        this.socket.emit('init', { 
            model:this.model, 
            colour: this.colour,
            x: this.object.position.x,
            y: this.object.position.y,
            z: this.object.position.z,
            h: this.object.rotation.y,
            pb: this.object.rotation.x
        });
    }

    updateSocket() {
        if (this.socket !== undefined) {
            const data = {
                x: this.object.position.x,
                y: this.object.position.y,
                z: this.object.position.z,
                h: this.object.rotation.y,  
                pb: 0,                      // 保持为0，避免俯仰角
                action: this.action,
                model: this.model,
                id: this.id
            };
            
            this.socket.emit('update', data);
        }
    }
	
	move(dt){
        const pos = this.object.position.clone();
        pos.y += 60;
        
        let dir = new THREE.Vector3();
        let raycaster = new THREE.Raycaster();
        let blocked = false;
        
        // 前方碰撞检测
        this.object.getWorldDirection(dir);
        if (this.motion.forward < 0) dir.negate();
        raycaster.set(pos, dir);

        // 检测与其他玩家的碰撞
        if (this.game.remoteColliders && this.game.remoteColliders.length > 0) {
            const playerCollisions = raycaster.intersectObjects(this.game.remoteColliders);
            if (playerCollisions.length > 0 && playerCollisions[0].distance < 50) {
                console.log("Player collision detected!");
                blocked = true;
            }
        }

        // 检测与环境的碰撞
        if (!blocked && this.game.colliders) {
            const envCollisions = raycaster.intersectObjects(this.game.colliders);
            if (envCollisions.length > 0 && envCollisions[0].distance < 50) {
                console.log("Environment collision detected!");
                blocked = true;
            }
        }

        // 移动处理
        if (!blocked){
            if (this.motion.forward > 0){
                const speed = (this.action == 'Running') ? 500 : 150;
                this.object.translateZ(dt * speed);
            }else{
                this.object.translateZ(-dt * 30);
            }
        }

        // 左右碰撞检测
        if (this.game.remoteColliders || this.game.colliders) {
            // 左侧检测
            dir.set(-1, 0, 0);
            dir.applyMatrix4(this.object.matrix);
            dir.normalize();
            raycaster.set(pos, dir);

            let leftCollisions = [];
            if (this.game.colliders) {
                leftCollisions = leftCollisions.concat(raycaster.intersectObjects(this.game.colliders));
            }
            if (this.game.remoteColliders) {
                leftCollisions = leftCollisions.concat(raycaster.intersectObjects(this.game.remoteColliders));
            }

            if (leftCollisions.length > 0 && leftCollisions[0].distance < 50) {
                this.object.translateX(50 - leftCollisions[0].distance);
            }

            // 右侧检测
            dir.set(1, 0, 0);
            dir.applyMatrix4(this.object.matrix);
            dir.normalize();
            raycaster.set(pos, dir);

            let rightCollisions = [];
            if (this.game.colliders) {
                rightCollisions = rightCollisions.concat(raycaster.intersectObjects(this.game.colliders));
            }
            if (this.game.remoteColliders) {
                rightCollisions = rightCollisions.concat(raycaster.intersectObjects(this.game.remoteColliders));
            }

            if (rightCollisions.length > 0 && rightCollisions[0].distance < 50) {
                this.object.translateX(-(50 - rightCollisions[0].distance));
            }
        }

        // 垂直方向检测（原有代码）
        dir.set(0, -1, 0);
        pos.y += 50;
        raycaster.set(pos, dir);
        const gravity = 30;

        let groundCollisions = [];
        if (this.game.colliders) {
            groundCollisions = raycaster.intersectObjects(this.game.colliders);
        }

        if (groundCollisions.length > 0) {
            const targetY = pos.y - groundCollisions[0].distance;
            if (targetY > this.object.position.y) {
                this.object.position.y = 0.8 * this.object.position.y + 0.2 * targetY;
                this.velocityY = 0;
            } else if (targetY < this.object.position.y) {
                if (this.velocityY === undefined) this.velocityY = 0;
                this.velocityY += dt * gravity;
                this.object.position.y -= this.velocityY;
                if (this.object.position.y < targetY) {
                    this.velocityY = 0;
                    this.object.position.y = targetY;
                }
            }
        }

        this.object.rotateY(this.motion.turn * dt);
        this.updateSocket();
    }
}

class SpeechBubble{
	constructor(game, msg, size=1){
		this.config = { font:'Calibri', size:24, padding:10, colour:'#222', width:256, height:256 };
		
		const planeGeometry = new THREE.PlaneGeometry(size, size);
		const planeMaterial = new THREE.MeshBasicMaterial()
		this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);
		game.scene.add(this.mesh);
		
		const self = this;
		const loader = new THREE.TextureLoader();
		loader.load(
			// resource URL
			`${game.assetsPath}images/speech.png`,

			// onLoad callback
			function ( texture ) {
				// in this example we create the material when the texture is loaded
				self.img = texture.image;
				self.mesh.material.map = texture;
				self.mesh.material.transparent = true;
				self.mesh.material.needsUpdate = true;
				if (msg!==undefined) self.update(msg);
			},

			// onProgress callback currently not supported
			undefined,

			// onError callback
			function ( err ) {
				console.error( 'An error happened.' );
			}
		);
	}
	
	update(msg){
		if (this.mesh===undefined) return;
		
		let context = this.context;
		
		if (this.mesh.userData.context===undefined){
			const canvas = this.createOffscreenCanvas(this.config.width, this.config.height);
			this.context = canvas.getContext('2d');
			context = this.context;
			context.font = `${this.config.size}pt ${this.config.font}`;
			context.fillStyle = this.config.colour;
			context.textAlign = 'center';
			this.mesh.material.map = new THREE.CanvasTexture(canvas);
		}
		
		const bg = this.img;
		context.clearRect(0, 0, this.config.width, this.config.height);
		context.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, this.config.width, this.config.height);
		this.wrapText(msg, context);
		
		this.mesh.material.map.needsUpdate = true;
	}
	
	createOffscreenCanvas(w, h) {
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		return canvas;
	}
	
	wrapText(text, context){
		const words = text.split(' ');
        let line = '';
		const lines = [];
		const maxWidth = this.config.width - 2*this.config.padding;
		const lineHeight = this.config.size + 8;
		
		words.forEach( function(word){
			const testLine = `${line}${word} `;
        	const metrics = context.measureText(testLine);
        	const testWidth = metrics.width;
			if (testWidth > maxWidth) {
				lines.push(line);
				line = `${word} `;
			}else {
				line = testLine;
			}
		});
		
		if (line != '') lines.push(line);
		
		let y = (this.config.height - lines.length * lineHeight)/2;
		
		lines.forEach( function(line){
			context.fillText(line, 128, y);
			y += lineHeight;
		});
	}
	
	show(pos){
		if (this.mesh!==undefined && this.player!==undefined){
			this.mesh.position.set(this.player.object.position.x, this.player.object.position.y + 380, this.player.object.position.z);
			this.mesh.lookAt(pos);
		}
	}
}