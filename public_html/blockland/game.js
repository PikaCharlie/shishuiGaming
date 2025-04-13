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
			'Northern Soul Floor Combo.fbx',
			'Standing Melee Kick.fbx',
			'Mutant Dying.fbx',
			'Dying.fbx'
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

		window.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'a' && this.player && !this.player.isDead) {
                this.player.attack();
            }
        });

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
	
	playerControl(forward, turn) {
		if (this.player.isDead) return; // 添加死亡检查
		
		turn = -turn;
		
		if (forward>0.3) {
			if (this.player.action!='Walking' && this.player.action!='Running') this.player.action = 'Walking';
		}else if (forward<-0.3) {
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
	
	showMessage(msg, fontSize=20) {
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.color = 'white';
    messageDiv.style.fontSize = `${fontSize}px`;
    messageDiv.style.textShadow = '2px 2px black';
    messageDiv.style.zIndex = '1000';
    messageDiv.style.textAlign = 'center';
    messageDiv.textContent = msg;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 3000);
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

		// 更新所有玩家的血条
		if (this.player) {
			this.player.updateHealthBar();
		}
		this.remotePlayers.forEach(player => {
			if (player && player.updateHealthBar) {
				player.updateHealthBar();
			}
		});

		// 如果在观战模式，更新摄像机位置
		if (this.spectatorTarget && !this.cameras.active) {
			const targetPos = this.spectatorTarget.object.position;
			this.camera.lookAt(targetPos);
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

	switchToSpectatorMode() {
    const alivePlayers = this.remotePlayers.filter(player => !player.isDead);
    if (alivePlayers.length > 0) {
        const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        
        // 设置观战目标
        this.spectatorTarget = randomPlayer;
        
        // 设置初始摄像机位置
        this.spectatorAngle = 0;  // 初始角度
        this.spectatorDistance = 1000;  // 观战距离
        this.spectatorHeight = 500;     // 观战高度

        // 禁用原有的摄像机控制
        this.cameras.active = null;
        
        // 更新摄像机控制逻辑
        if (this.joystick) {
            // 保持遥感可见，但更改其功能
            this.joystick.onMove = (forward, turn) => {
                if (this.spectatorTarget) {
                    // 使用遥感的左右移动来旋转视角 (降低速度)
                    this.spectatorAngle += turn * 0.2;
                    
                    // 使用遥感的前后移动来调整距离 (降低速度)
                    this.spectatorDistance = Math.max(500, Math.min(2000, 
                        this.spectatorDistance - forward * 2));

                    // 计算新的摄像机位置
                    const targetPos = this.spectatorTarget.object.position;
                    const angle = this.spectatorAngle;
                    
                    // 更新摄像机位置
                    this.camera.position.x = targetPos.x + Math.sin(angle) * this.spectatorDistance;
                    this.camera.position.z = targetPos.z + Math.cos(angle) * this.spectatorDistance;
                    this.camera.position.y = targetPos.y + this.spectatorHeight;
                    
                    // 始终看向目标玩家
                    this.camera.lookAt(targetPos);
                }
            };
        }

        // 初始化摄像机位置
        const targetPos = randomPlayer.object.position;
        this.camera.position.set(
            targetPos.x + Math.sin(this.spectatorAngle) * this.spectatorDistance,
            targetPos.y + this.spectatorHeight,
            targetPos.z + Math.cos(this.spectatorAngle) * this.spectatorDistance
        );
        this.camera.lookAt(targetPos);
        
        // 显示观战提示
        const spectatorInfo = document.createElement('div');
        spectatorInfo.id = 'spectatorInfo';
        spectatorInfo.style.position = 'fixed';
        spectatorInfo.style.top = '20px';
        spectatorInfo.style.left = '50%';
        spectatorInfo.style.transform = 'translateX(-50%)';
        spectatorInfo.style.color = 'white';
        spectatorInfo.style.fontSize = '24px';
        spectatorInfo.style.fontWeight = 'bold';
        spectatorInfo.style.textShadow = '2px 2px black';
        spectatorInfo.style.zIndex = '1000';
        spectatorInfo.style.backgroundColor = 'rgba(0,0,0,0.5)';
        spectatorInfo.style.padding = '10px 20px';
        spectatorInfo.style.borderRadius = '5px';
        spectatorInfo.textContent = `正在观战 ${randomPlayer.id}\n使用遥感调整视角`;
        document.body.appendChild(spectatorInfo);
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

        this.health = 5; // 初始5格血
        this.isDead = false; // 死亡状态
        this.isAttacking = false; // 攻击状态

        // 创建血条UI
        this.createHealthBar();
    }

    createHealthBar() {
        this.healthBar = document.createElement('div');
        this.healthBar.style.position = 'absolute';
        this.healthBar.style.width = '100px';
        this.healthBar.style.height = '10px';
        this.healthBar.style.backgroundColor = '#333';
        this.healthBar.style.border = '2px solid #000'; // 加粗边框
        this.healthBar.style.zIndex = '1000';
        this.healthBar.style.display = 'block';
        this.healthBar.style.pointerEvents = 'none'; // 防止血条影响点击
        
        this.healthFill = document.createElement('div');
        this.healthFill.style.width = '100%';
        this.healthFill.style.height = '100%';
        this.healthFill.style.backgroundColor = '#ff0000';
        this.healthFill.style.transition = 'width 0.3s';
        
        this.healthBar.appendChild(this.healthFill);
        document.body.appendChild(this.healthBar);
    }

    updateHealthBar() {
        if (!this.healthBar || !this.game.camera) return;

        // 计算屏幕坐标
        const vector = new THREE.Vector3();
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;

        // 获取角色头部位置
        vector.setFromMatrixPosition(this.object.matrixWorld);
        vector.y += 200; // 将血条放在角色头顶上方

        // 将3D坐标转换为屏幕坐标
        vector.project(this.game.camera);
        
        const x = (vector.x * widthHalf) + widthHalf;
        const y = -(vector.y * heightHalf) + heightHalf;

        // 设置血条位置和显示状态
        if (x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight) {
            this.healthBar.style.display = 'block';
            this.healthBar.style.left = `${x - 50}px`; // 居中对齐
            this.healthBar.style.top = `${y - 50}px`;
            this.healthFill.style.width = `${(this.health / 5) * 100}%`;
        } else {
            this.healthBar.style.display = 'none';
        }
    }

    takeDamage() {
        if (this.isDead) return;
        
        this.health--;
        console.log(`Player ${this.id} took damage. Health: ${this.health}`);
        
        // 更新血条显示
        this.updateHealthBar();

        if (this.health <= 0) {
            this.die();
        }
    }

	die() {
		if (this.isDead) return;
		
		this.isDead = true;
		this.action = 'Mutant Dying';
		this.motion = undefined;
		
		if (this.local) {
			if (this.game.joystick) {
				// 完全移除遥感容器
				const joystickContainer = document.querySelector('.joystick-container');
				if (joystickContainer) {
					joystickContainer.style.display = 'none';
					// 或者完全移除
					// joystickContainer.remove();
				}
			}
	
			// 2. 显示死亡提示
			const gameOverDiv = document.createElement('div');
			gameOverDiv.id = 'gameOverMessage';
			gameOverDiv.style.position = 'fixed';
			gameOverDiv.style.top = '30%';
			gameOverDiv.style.left = '50%';
			gameOverDiv.style.transform = 'translate(-50%, -50%)';
			gameOverDiv.style.color = 'red';
			gameOverDiv.style.fontSize = '48px';
			gameOverDiv.style.fontWeight = 'bold';
			gameOverDiv.style.textShadow = '2px 2px black';
			gameOverDiv.style.zIndex = '1000';
			gameOverDiv.textContent = '你已死亡!';
			document.body.appendChild(gameOverDiv);
	
			// 3. 创建倒计时显示
			const countdownDiv = document.createElement('div');
			countdownDiv.id = 'countdownMessage';
			countdownDiv.style.position = 'fixed';
			countdownDiv.style.top = '40%';
			countdownDiv.style.left = '50%';
			countdownDiv.style.transform = 'translate(-50%, -50%)';
			countdownDiv.style.color = 'white';
			countdownDiv.style.fontSize = '36px';
			countdownDiv.style.textShadow = '2px 2px black';
			countdownDiv.style.zIndex = '1000';
			document.body.appendChild(countdownDiv);
	
			// 4. 播放死亡动画序列
			const mutantDyingDuration = this.animations['Mutant Dying'].duration * 1000;
			console.log("播放死亡动画，持续时间:", mutantDyingDuration);
			
			setTimeout(() => {
				// 切换到持续死亡动画
				this.action = 'Dying';
				console.log("切换到持续死亡动画");
				
				// 5. 开始倒计时
				let countdown = 5;
				const countdownInterval = setInterval(() => {
					countdownDiv.textContent = `${countdown}秒后进入观战模式`;
					countdown--;
					
					if (countdown < 0) {
						// 清理倒计时
						clearInterval(countdownInterval);
						
						// 移除UI元素
						document.body.removeChild(countdownDiv);
						document.body.removeChild(gameOverDiv);
						
						// 6. 进入观战模式
						console.log("进入观战模式");
						this.game.switchToSpectatorMode();
					}
				}, 1000);
			}, mutantDyingDuration);
	
			// 发送死亡状态到服务器
			if (this.socket) {
				this.socket.emit('playerDied', { id: this.id });
			}
		}
	}

    attack() {
        if (this.isDead || this.isAttacking) return;

        this.isAttacking = true;
        this.action = 'Standing Melee Kick';

        // 检测2单位距离内的其他玩家
        this.game.remotePlayers.forEach(player => {
            if (!player.isDead) {
                const distance = this.object.position.distanceTo(player.object.position);
                if (distance <= 200) { // 增大检测范围，使其更容易命中
                    console.log(`Attacking player ${player.id} at distance ${distance}`);
                    // 直接发送攻击事件
                    this.socket.emit('playerAttack', {
                        attackerId: this.id,
                        targetId: player.id
                    });
                }
            }
        });

        // 攻击动画结束后重置状态
        setTimeout(() => {
            this.isAttacking = false;
            if (!this.isDead) {
                this.action = 'Idle';
            }
        }, this.animations['Standing Melee Kick'].duration * 1000);
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

        this.updateHealthBar();
    }

    move(dt) {
        // 如果已死亡或不能移动，直接返回
        if (this.isDead) return;

    const pos = this.object.position.clone();
    pos.y += 60;
    
    let dir = new THREE.Vector3();
    let raycaster = new THREE.Raycaster();
    let blocked = false;
    
    // 前方碰撞检测
    this.object.getWorldDirection(dir);
    if (this.motion.forward < 0) dir.negate();
    raycaster.set(pos, dir);

        // 检测与玩家和环境的碰撞
        if (this.game.remoteColliders?.length > 0) {
            const playerCollisions = raycaster.intersectObjects(this.game.remoteColliders);
            if (playerCollisions.length > 0 && playerCollisions[0].distance < 50) {
                blocked = true;
            }
        }

        if (!blocked && this.game.colliders) {
            const envCollisions = raycaster.intersectObjects(this.game.colliders);
            if (envCollisions.length > 0 && envCollisions[0].distance < 50) {
                blocked = true;
            }
        }

        // 移动处理
        if (!blocked) {
            if (this.motion.forward > 0) {
                const speed = (this.action == 'Running') ? 500 : 150;
                this.object.translateZ(dt * speed);
            } else {
                this.object.translateZ(-dt * 30);
            }
        }

        // 左右碰撞检测
        [-1, 1].forEach(direction => {
            dir.set(direction, 0, 0);
            dir.applyMatrix4(this.object.matrix);
            dir.normalize();
            raycaster.set(pos, dir);

            let collisions = [];
            if (this.game.colliders) {
                collisions = collisions.concat(raycaster.intersectObjects(this.game.colliders));
            }
            if (this.game.remoteColliders) {
                collisions = collisions.concat(raycaster.intersectObjects(this.game.remoteColliders));
            }

            if (collisions.length > 0 && collisions[0].distance < 50) {
                this.object.translateX(direction * (50 - collisions[0].distance));
            }
        });

        // 垂直方向检测
        dir.set(0, -1, 0);
        pos.y += 50;
        raycaster.set(pos, dir);
        const gravity = 30;

        let groundCollisions = this.game.colliders ? 
            raycaster.intersectObjects(this.game.colliders) : [];

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
        
        // 如果是本地玩家，更新socket
        if (this.local) {
            this.updateSocket();
        }
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
		
		// 添加攻击事件监听
		socket.on('playerAttacked', function(data) {
			console.log('Received attack event:', data);
			
			// 如果自己被攻击
			if (data.targetId === player.id) {
				console.log(`Player ${player.id} takes damage`);
				player.takeDamage();
			}
			// 如果其他玩家被攻击
			else {
				const targetPlayer = game.getRemotePlayerById(data.targetId);
				if (targetPlayer) {
					console.log(`Remote player ${targetPlayer.id} takes damage`);
					targetPlayer.takeDamage();
				}
			}
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
		if (this.socket !== undefined && !this.isDead) { // 添加死亡检查
			const data = {
				x: this.object.position.x,
				y: this.object.position.y,
				z: this.object.position.z,
				h: this.object.rotation.y,
				pb: 0,
				action: this.action,
				model: this.model,
				id: this.id
			};
			this.socket.emit('update', data);
		}
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