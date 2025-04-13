class Player {
    constructor() {
        this.inventory = []; // 背包，用于存储收集的道具
    }

    addItem(itemName) {
        this.inventory.push(itemName);
        console.log(`Collected: ${itemName}`);
        console.log(`Inventory:`, this.inventory);
    }

    removeItem(index) {
        const itemName = this.inventory[index];
        this.inventory.splice(index, 1);
        return itemName;
    }

    getInventory() {
        return this.inventory;
    }
}

class Game {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.height = '100%';
        document.body.appendChild(this.container);

        this.clock = new THREE.Clock();
        this.mixer = null;
        this.player = new Player(); // 创建 Player 实例
        this.animations = {}; // 存储动画剪辑
        this.currentAnimation = 'Idle'; // 当前动画状态
        this.colliders = []; // Add colliders array

        this.lastLogTime = 0; // 修正：将 lastLogTime 移到类的属性中

        this.interactableItems = []; // 可交互的道具列表
        this.createInventoryUI();

        this.init();
        this.animate();

        // 初始化背景音乐
        this.initBackgroundMusic();
        this.loadFootstepSound();
    }

    createCelShadingMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                lightDirection: { value: new THREE.Vector3(0, 1, 0).normalize() }, // 光源方向
                baseColor: { value: new THREE.Color(0x88ccee) }, // 基础颜色
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
    
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * vec4(vPosition, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                uniform vec3 lightDirection;
                uniform vec3 baseColor;
    
                void main() {
                    float intensity = dot(vNormal, lightDirection);
                    if (intensity > 0.95) {
                        gl_FragColor = vec4(baseColor * 1.0, 1.0); // 最亮
                    } else if (intensity > 0.5) {
                        gl_FragColor = vec4(baseColor * 0.8, 1.0); // 中等亮度
                    } else if (intensity > 0.25) {
                        gl_FragColor = vec4(baseColor * 0.5, 1.0); // 暗部
                    } else {
                        gl_FragColor = vec4(baseColor * 0.3, 1.0); // 最暗
                    }
                }
            `,
        });
    }


    loadFootstepSound() {
        const listener = new THREE.AudioListener();
        this.camera.add(listener); // 将音频监听器添加到摄像机
    
        const audioLoader = new THREE.AudioLoader();
    
        // 加载脚步声 1
        const footstep1 = new THREE.Audio(listener);
        audioLoader.load('sound/footstep1.mp3', (buffer) => {
            footstep1.setBuffer(buffer);
            footstep1.setLoop(false); // 不循环播放
            footstep1.setVolume(0.5); // 设置音量
        });
    
        // 加载脚步声 2
        const footstep2 = new THREE.Audio(listener);
        audioLoader.load('sound/footstep2.mp3', (buffer) => {
            footstep2.setBuffer(buffer);
            footstep2.setLoop(false); // 不循环播放
            footstep2.setVolume(0.5); // 设置音量
        });
    
        // 保存到数组中
        this.footstepSounds = [footstep1, footstep2];
        this.currentFootstepIndex = 0; // 当前播放的脚步声索引
    }

    initBackgroundMusic() {
        const listener = new THREE.AudioListener();
        this.camera.add(listener); // 将音频监听器添加到摄像机
    
        const sound = new THREE.Audio(listener);
        const audioLoader = new THREE.AudioLoader();
    
        // 加载背景音乐
        audioLoader.load('sound/bgm2.mp3', (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(true); // 设置循环播放
            sound.setVolume(0.5); // 设置音量（0.0 到 1.0）
    
            // 等待用户交互后播放音乐
            const playMusic = () => {
                sound.play();
                document.body.removeEventListener('click', playMusic); // 移除事件监听器
            };
            document.body.addEventListener('click', playMusic);
        });
    
        this.backgroundMusic = sound; // 保存音乐对象以便后续控制
    }


    createInventoryUI() {
        // 创建背包容器
        this.inventoryUI = document.createElement('div');
        this.inventoryUI.style.position = 'absolute';
        this.inventoryUI.style.top = '10%';
        this.inventoryUI.style.left = '10%';
        this.inventoryUI.style.width = '300px';
        this.inventoryUI.style.height = '400px';
        this.inventoryUI.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.inventoryUI.style.color = 'white';
        this.inventoryUI.style.padding = '10px';
        this.inventoryUI.style.borderRadius = '10px';
        this.inventoryUI.style.overflowY = 'auto';
        this.inventoryUI.style.display = 'none'; // 默认隐藏
        this.inventoryUI.style.zIndex = '1000'; // 确保在最上层
    
        // 添加标题
        const title = document.createElement('h3');
        title.innerText = '背包';
        title.style.textAlign = 'center';
        this.inventoryUI.appendChild(title);
    
        // 添加到页面
        document.body.appendChild(this.inventoryUI);
    }
    
    updateInventoryUI() {
        // 清空当前内容
        this.inventoryUI.innerHTML = '';
    
        // 添加标题
        const title = document.createElement('h3');
        title.innerText = '背包';
        title.style.textAlign = 'center';
        this.inventoryUI.appendChild(title);
    
        // 显示背包中的道具
        const inventory = this.player.getInventory();
        if (inventory.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.innerText = '背包是空的';
            emptyMessage.style.textAlign = 'center';
            this.inventoryUI.appendChild(emptyMessage);
        } else {
            inventory.forEach((itemName, index) => {
                const itemContainer = document.createElement('div');
                itemContainer.style.display = 'flex';
                itemContainer.style.justifyContent = 'space-between';
                itemContainer.style.marginBottom = '5px';
    
                const itemElement = document.createElement('span');
                itemElement.innerText = itemName;

                const useButton = document.createElement('button');
                useButton.innerText = '使用';
                useButton.style.marginLeft = '10px';
                useButton.onclick = () => this.useItem(itemName); // 绑定使用功能
    
                const dropButton = document.createElement('button');
                dropButton.innerText = '丢弃';
                dropButton.style.marginLeft = '10px';
                dropButton.onclick = () => this.dropItem(index);
    
                const inspectButton = document.createElement('button');
                inspectButton.innerText = '检视';
                inspectButton.style.marginLeft = '10px';
                inspectButton.onclick = () => this.inspectItem(itemName);
    
                itemContainer.appendChild(itemElement);
                itemContainer.appendChild(useButton);
                itemContainer.appendChild(dropButton);
                itemContainer.appendChild(inspectButton);
                this.inventoryUI.appendChild(itemContainer);
            });
        }
    }

    dropItem(index) {
        // 获取玩家当前位置
        const playerPos = this.player.object.position.clone();
    
        // 获取要丢弃的道具名称
        const itemName = this.player.removeItem(index);
    
        // 更新背包 UI
        this.updateInventoryUI();
    
        // 创建一个新的道具对象并放置在玩家当前位置
        const gltfLoader = new THREE.GLTFLoader();
        gltfLoader.load(`model/item/${itemName}.gltf`, (gltf) => {
            const item = gltf.scene;
            item.name = itemName;
            item.position.set(playerPos.x, playerPos.y, playerPos.z);
            item.scale.set(5, 5, 5); // 根据需要调整大小
            this.scene.add(item);
    
            // 将道具添加到可交互列表
            this.interactableItems.push(item);
        });
    
        console.log(`Dropped: ${itemName} at position (${playerPos.x}, ${playerPos.y}, ${playerPos.z})`);
    }

    inspectItem(itemName) {
        // 如果已有检视模型，先移除
        if (this.inspectScene) {
            this.scene.remove(this.inspectScene);
            this.inspectScene = null;
        }
    
        // 加载道具模型
        const gltfLoader = new THREE.GLTFLoader();
        gltfLoader.load(`model/item/${itemName}.gltf`, (gltf) => {
            const item = gltf.scene;
            item.name = `Inspect-${itemName}`;
            item.position.set(0, 0, 0); // 屏幕中央
            item.scale.set(10, 10, 10); // 根据需要调整大小
    
            // 创建一个独立的场景用于检视
            this.inspectScene = new THREE.Scene();
            this.inspectScene.add(item);

             // 添加环境光
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 白色环境光，强度为 0.5
            this.inspectScene.add(ambientLight);
            // 添加光源
            const light = new THREE.PointLight(0xffffff, 1);
            light.position.set(10, 10, 10);
            this.inspectScene.add(light);
    
            // 添加一个简单的背景
            const background = new THREE.Color(0x333333);
            this.inspectScene.background = background;
    
            // 切换到检视模式
            this.isInspecting = true;
            this.inspectObject = item;

            // 创建一个独立的摄像机用于检视
            this.inspectCamera = new THREE.PerspectiveCamera(
                45,
                window.innerWidth / window.innerHeight,
                1,
                1000
            );
            this.inspectCamera.position.set(0, 0, 50); // 设置摄像机位置
            this.inspectCamera.lookAt(item.position); // 对准道具
    
            // 创建 OrbitControls 用于旋转模型
            this.inspectControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.inspectControls.target.copy(item.position);
            this.inspectControls.update();
        });
    }
    
    toggleInventoryUI() {
        if (this.inventoryUI.style.display === 'none') {
            this.updateInventoryUI();
            this.inventoryUI.style.display = 'block';
        } else {
            this.inventoryUI.style.display = 'none';
        }
    }

    updateLightDirection() {
        const light = this.scene.getObjectByName('DirectionalLight'); // 假设有一个方向光
        if (light) {
            const direction = new THREE.Vector3();
            light.getWorldDirection(direction);
            this.celShadingMaterial.uniforms.lightDirection.value.copy(direction.normalize());
        }
    }

    

    init() {
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xa0a0a0, 500, 5000); // Increased fog distance

        // Adjust camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 200000);
        this.camera.position.set(0, 1000, 2000);

        this.preloadBackroomScene();



        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 更好的阴影效果
        this.container.appendChild(this.renderer.domElement);

        // Controls setup
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 200, 0); // 调整控制器观察点的高度
        this.controls.update();
        this.controls.enabled = false; // 禁用 OrbitControls

        //场景光源
        // const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3); // Reduced intensity
        // hemiLight.position.set(0, 200, 0);
        // this.scene.add(hemiLight);

        // const dirLight = new THREE.DirectionalLight(0xffffff, 0.5); // Adjusted intensity
        // dirLight.position.set(0, 200, 100);
        // dirLight.castShadow = true;
        // dirLight.shadow.camera.top = 180;
        // dirLight.shadow.camera.bottom = -100;
        // dirLight.shadow.camera.left = -120;
        // dirLight.shadow.camera.right = 120;
        // this.scene.add(dirLight);
        
        

        // Load scene model with colliders
        const gltfLoader = new THREE.GLTFLoader();
        gltfLoader.load('model/map.gltf', (gltf) => {
            const scene = gltf.scene;

        // 遍历场景中的所有子对象
        scene.traverse((child) => {
            if (child.isMesh) {
                // 创建 MeshPhysicalMaterial
                const physicalMaterial = new THREE.MeshPhysicalMaterial({
                    color: child.material.color || new THREE.Color(0xffffff), // 使用原始材质的颜色
                    roughness: 0.5, // 调整粗糙度
                    metalness: 0.1, // 调整金属度
                    clearcoat: 0.3, // 添加清漆效果
                    clearcoatRoughness: 0.2, // 清漆粗糙度
                    reflectivity: 0.5, // 反射率
                    transmission: 0.5, // 半透明效果
                    opacity: 1.0, // 不透明
                    side: THREE.DoubleSide, // 双面渲染
                });

                // 如果原始材质有贴图，保留贴图
                if (child.material.map) {
                    physicalMaterial.map = child.material.map;
                }

                // 替换材质
                child.material = physicalMaterial;

                // 启用阴影
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
            
            // 计算场景包围盒获取实际大小
            const box = new THREE.Box3().setFromObject(scene);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            // 根据实际大小调整缩放
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1000 / maxDim; // 设置期望的场景大小
            scene.scale.set(scale, scale, scale);
            
            // 确保场景位于原点
            scene.position.set(-center.x * scale, 0, -center.z * scale);
            
            scene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // 将所有网格添加到碰撞器数组
                    this.colliders.push(child);
                    
                    // 如果是地面网格，确保接收阴影
                    if (child.name.toLowerCase().includes('ground') || 
                        child.name.toLowerCase().includes('floor')) {
                        child.receiveShadow = true;
                    }
                }
            });
            
            this.scene.add(scene);
            
            // 在场景加载完成后再加载角色
            this.loadCharacter();

            // 修改加载 SCP-999 道具的路径
            const gltfLoader = new THREE.GLTFLoader();
            gltfLoader.load('model/item/scp-999.gltf', (gltf) => { // 更新路径
                const item = gltf.scene;
                item.name = 'SCP-999'; // 设置道具名称
                item.position.set(208, 62, -214); // 设置道具位置
                item.scale.set(5, 5, 5); // 调整道具大小
                item.userData.originalScale = item.scale.clone(); // 保存初始大小
                this.scene.add(item);

                // 将道具添加到可交互列表
                this.interactableItems.push(item);
            });

            // 加载 medkit
            gltfLoader.load('model/item/medkit.gltf', (gltf) => {
                const item = gltf.scene;
                item.name = 'medkit';
                item.position.set(150, 62, -80);
                item.scale.set(5, 5, 5);
                
                this.scene.add(item);
                this.interactableItems.push(item);
            });

            // 监听键盘事件
            window.addEventListener('keydown', (event) => this.onKeyDown(event));
        });

        // 绑定窗口调整事件
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // 初始化虚拟摇杆
        this.joystick = new JoyStick({
            onMove: this.playerControl.bind(this),
            game: this,
        });
    }

    preloadBackroomScene() {
        const gltfLoader = new THREE.GLTFLoader();
        gltfLoader.load('backroom/backroom.gltf', (gltf) => {
            const backroomScene = gltf.scene;
    
            // 将 backroom 场景放置在远处
            backroomScene.scale.set(30, 30, 30); // 根据需要调整大小
            backroomScene.position.set(10000, 0, 0); // 放置在远处
            this.scene.add(backroomScene);
    
            // 更新碰撞器
            backroomScene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    this.colliders.push(child); // 添加到碰撞器数组
                }
            });
    
            this.backroomScene = backroomScene; // 保存 backroom 场景引用
            console.log('Backroom scene preloaded at a distant location.');
        });
    }



    useItem(itemName) {
        if (itemName === 'SCP-999') {
            console.log('Using SCP-999...');
            if (this.backroomScene) {
                // 将角色传送到 backroom 场景的位置
                const backroomPosition = this.backroomScene.position.clone();
                this.player.object.position.set(
                    backroomPosition.x + 0, // 根据需要调整偏移
                    backroomPosition.y + 10, // 确保角色在地面上
                    backroomPosition.z + 0
                );
                console.log('Player has been teleported to the backroom.');
            } else {
                console.error('Backroom scene is not loaded.');
            }
        } else {
            console.log(`Item ${itemName} has no use.`);
        }
    }

    loadCharacter() {
        const loader = new THREE.FBXLoader();
        loader.load('model/character/HumanIdle.fbx', (object) => {

            this.player.object = object;
            this.player.mixer = new THREE.AnimationMixer(object);

            // 调整人物大小
            object.scale.set(0.17,0.17,0.17);

            // 找到合适的出生点
            const spawnPoint = this.findSpawnPoint();
            object.position.copy(spawnPoint.position);

            // 确保角色站在地面上
            object.position.y += 0.1; // 稍微抬高以防穿透

            // 修改碰撞盒大小和位置
            const geometry = new THREE.BoxGeometry(20, 160, 20);
            const material = new THREE.MeshBasicMaterial({ 
                visible: false,
                wireframe: true,
                opacity: 0.5,
                transparent: true 
            });
            const collider = new THREE.Mesh(geometry, material);
            collider.position.set(0, 80, 0); // 将碰撞盒移到角色中心
            object.add(collider);
            this.playerCollider = collider;

            // 角色光源
            const playerLight = new THREE.PointLight(0xffffff, 1, 100); // 白色点光源，强度为1，范围500
            playerLight.position.set(0, 200, 0); // 光源位置在角色头顶
            object.add(playerLight); // 将光源添加为角色的子对象

            this.scene.add(object);
            
            // 加载动画
            if (object.animations.length > 0) {
                this.animations['Idle'] = object.animations[0];
                this.action = 'Idle';
            }

            this.loadAnimations(loader);
            this.createCameras();
        });
    }

    loadAnimations(loader) {
        const animationsToLoad = [
            { name: 'Walking', path: 'model/character/HumanWalk.fbx' },
            { name: 'Running', path: 'model/character/Run.fbx' },
            { name: 'Backwards', path: 'model/character/Backwards.fbx' },
            { name: 'Turn', path: 'model/character/Turn.fbx' },
        ];

        animationsToLoad.forEach((anim) => {
            loader.load(anim.path, (object) => {
                if (object.animations.length > 0) {
                    this.animations[anim.name] = object.animations[0];
                    console.log(`Loaded animation: ${anim.name}`);
                } else {
                    console.warn(`No animations found in ${anim.path}`);
                }
            });
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    set action(name) {
        if (this.player?.action === name || !this.animations[name]) return;

        const clip = this.animations[name];
        const action = this.player.mixer.clipAction(clip);

        this.player.mixer.stopAllAction();
        action.reset();
        action.fadeIn(0.5);
        action.play();

        this.player.action = name;
    }

    playerControl(forward, turn) {
        turn = -turn;

        if (forward > 0.7) {
            // 当 forward > 0.7 时切换到 Running 动画
            if (this.player.action !== 'Running') {
                this.action = 'Running';
            }
        } else if (forward > 0.3) {
            // 当 forward 在 0.3 到 0.7 之间时切换到 Walking 动画
            if (this.player.action !== 'Walking') {
                this.action = 'Walking';
            }
        } else if (forward < -0.3) {
            // 当 forward < -0.3 时切换到 Backwards 动画
            if (this.player.action !== 'Backwards') {
                this.action = 'Backwards';
            }
        } else {
            forward = 0;
            if (Math.abs(turn) > 0.1) {
                // 当 turn 的绝对值大于 0.1 时切换到 Turn 动画
                if (this.player.action !== 'Turn') {
                    this.action = 'Turn';
                }
            } else if (this.player.action !== 'Idle') {
                // 当没有移动时切换到 Idle 动画
                this.action = 'Idle';
            }
        }

        if (forward === 0 && turn === 0) {
            delete this.player.move;
        } else {
            this.player.move = { forward, turn };
        }
    }

    movePlayer(delta) {
        if (!this.player?.move) return;

        const speed = this.player.action === 'Running' ? 100 : 75; // 移动速度
        const pos = this.player.object.position.clone();

        // 前向移动检测
        if (this.player.move.forward) {
            let dir = new THREE.Vector3(0, 0, 1);
            dir.applyQuaternion(this.player.object.quaternion);

            const raycaster = new THREE.Raycaster(
                pos.clone().add(new THREE.Vector3(0, 18, 0)), // 从角色脚部稍上方检测
                dir
            );
            const intersects = raycaster.intersectObjects(this.colliders);

            // 只有在前方没有障碍物时才移动
            if (intersects.length === 0 || intersects[0].distance > 20) {
                this.player.object.translateZ(this.player.move.forward * speed * delta);

                // 播放脚步声
                if (!this.footstepSounds[this.currentFootstepIndex].isPlaying) {
                    const interval = this.player.action === 'Running' ? 5.0 : 8.0; // 跑步更快
                    const currentSound = this.footstepSounds[this.currentFootstepIndex];
                    currentSound.play();

                    // 切换到下一个脚步声
                    this.currentFootstepIndex = (this.currentFootstepIndex + 8) % this.footstepSounds.length;

                    setTimeout(() => {
                        if (this.player.move.forward) currentSound.stop();
                    }, interval * 1000);
                }
            }
        }

        // 检测与道具的距离
        this.interactableItems.forEach((item) => {
            const distance = pos.distanceTo(item.position);
            if (distance < 50) {
                // 高亮显示靠近的道具
                // item.traverse((child) => {
                //     if (child.isMesh) {
                //         child.material.emissive = new THREE.Color(0x00ff00); // 绿色高亮
                //     }
                // });
                // 显示道具名称
                this.showItemName(item);
            } else {
                // 恢复默认状态
                item.traverse((child) => {
                    if (child.isMesh) {
                        child.material.emissive = new THREE.Color(0x000000); // 无高亮
                    }
                });
                // 隐藏道具名称
                this.hideItemName(item);
            }
        });

        // 重力和地面检测
        const groundRaycaster = new THREE.Raycaster(
            pos.clone().add(new THREE.Vector3(0, 20, 0)), // 从角色中心向下检测
            new THREE.Vector3(0, -1, 0)
        );

        const groundIntersects = groundRaycaster.intersectObjects(this.colliders);

        if (groundIntersects.length > 0) {
            const targetY = groundIntersects[0].point.y;
            // 平滑过渡到目标高度
            this.player.object.position.y += (targetY - this.player.object.position.y) * 0.1;
        }

        // 旋转控制
        if (this.player.move.turn) {
            this.player.object.rotateY(this.player.move.turn * Math.PI * delta);
        }
    }

    showItemName(item) {
        if (!item.nameTag) {
            // 创建一个 HTML 元素作为名称标签
            const nameTag = document.createElement('div');
            nameTag.style.position = 'absolute';
            nameTag.style.color = 'white';
            nameTag.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            nameTag.style.padding = '2px 5px';
            nameTag.style.borderRadius = '3px';
            nameTag.style.fontSize = '12px';
            nameTag.style.pointerEvents = 'none'; // 禁止鼠标事件
            nameTag.innerText = item.name;
    
            document.body.appendChild(nameTag);
            item.nameTag = nameTag;
        }
    
        // 更新名称标签的位置
        const itemPosition = item.position.clone();
        itemPosition.y += 20; // 将标签位置稍微抬高
        const screenPosition = itemPosition.project(this.camera);
    
        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;
    
        item.nameTag.style.left = `${x}px`;
        item.nameTag.style.top = `${y}px`;
        item.nameTag.style.display = 'block';
    }
    
    hideItemName(item) {
        if (item.nameTag) {
            item.nameTag.style.display = 'none';
        }
    }

    createCameras() {
        const back = new THREE.Object3D();
        back.position.set(0, 200, -550); // 调整相机高度和距离
        this.player.object.add(back); // 直接添加到玩家对象上，而不是设置 parent

        this.player.cameras = { back };
        this.activeCamera = this.player.cameras.back;
    }

    onKeyDown(event) {
        if (event.key === 'e' || event.key === 'E') {
            const playerPos = this.player.object.position.clone();
    
            // 检测是否有靠近的道具
            for (let i = 0; i < this.interactableItems.length; i++) {
                const item = this.interactableItems[i];
                const distance = playerPos.distanceTo(item.position);
    
                if (distance < 50) {
                    // 将道具添加到背包
                    this.player.addItem(item.name);
    
                    // 从场景和可交互列表中移除道具
                    this.scene.remove(item);
                    this.interactableItems.splice(i, 1);

                    // 移除名称标签
                    if (item.nameTag) {
                        document.body.removeChild(item.nameTag);
                    }
                    break;
                }
            }
        } else if (event.key === 'b' || event.key === 'B') {
            // 切换背包 UI 的显示状态
            this.toggleInventoryUI();
        }else if (event.key === 'Escape') {
            // 退出检视模式
            if (this.isInspecting) {
                this.isInspecting = false;
                this.scene.remove(this.inspectScene);
                this.inspectScene = null;
    
                // 移除 OrbitControls
                if (this.inspectControls) {
                    this.inspectControls.dispose();
                    this.inspectControls = null;
                }

                
                // 清理检视摄像机
                this.inspectCamera = null;
            }
        }
    }


    findSpawnPoint() {
        // 修改起始点位置，确保从高处开始检测
        const spawnPoints = [
             new THREE.Vector3(50, 50,50)
        ];

        const raycaster = new THREE.Raycaster();
        
        for (let point of spawnPoints) {
            // 向下射线检测
            raycaster.set(point, new THREE.Vector3(0, -1, 0));
            const intersects = raycaster.intersectObjects(this.colliders);

            if (intersects.length > 0) {
                // 找到地面后，检查头顶是否有遮挡
                const floorPoint = intersects[0].point;
                const heightCheck = new THREE.Raycaster();
                heightCheck.set(
                    new THREE.Vector3(floorPoint.x, floorPoint.y + 10, floorPoint.z),
                    new THREE.Vector3(0, 1, 0)
                );
                
                const ceilingIntersects = heightCheck.intersectObjects(this.colliders);
                
                // 确保有足够的空间容纳角色
                if (ceilingIntersects.length > 0 && ceilingIntersects[0].distance > 50) {
                    console.log('Found valid spawn point:', floorPoint);
                    return {
                        position: new THREE.Vector3(
                            floorPoint.x,
                            floorPoint.y,
                            floorPoint.z
                        )
                    };
                }
            }
        }

        // 默认位置
        return {
            position: new THREE.Vector3(-425.21,62.18,134.92)
        };
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // if (performance.now() % 5000 < 16) {
        //     this.takeDamage(5);
        // }

        if (this.player?.mixer) {
            this.player.mixer.update(delta);
        }

        if (this.player?.move) {
            this.movePlayer(delta);
        }

        // 每隔 1 秒输出一次角色坐标
        const currentTime = performance.now();
        if (currentTime - this.lastLogTime > 1000) { // 修正：使用 this.lastLogTime
            if (this.player?.object) {
                const position = this.player.object.position;
                console.log(`Player Position: x=${position.x.toFixed(2)}, y=${position.y.toFixed(2)}, z=${position.z.toFixed(2)}`);
            }
            this.lastLogTime = currentTime; // 修正：更新 this.lastLogTime
        }

        
        // 检视模式渲染
        if (this.isInspecting && this.inspectScene) {
            this.renderer.render(this.inspectScene, this.camera);
            if (this.inspectControls) {
                this.inspectControls.update();
            }
            return; // 跳过正常场景渲染
        }

        // 修改相机更新逻辑
        if (this.player?.cameras?.back) {
            const targetPos = this.player.cameras.back.getWorldPosition(new THREE.Vector3());
            this.camera.position.lerp(targetPos, 0.1);
            this.camera.lookAt(this.player.object.position);
            this.controls.target.copy(this.player.object.position);
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.onload = () => {
    new Game();
};