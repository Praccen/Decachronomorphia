import { EnemyData, EnemyTypesEnum } from "../../Constants/EnemyData.js";
import AnimationComponent from "../../Engine/ECS/Components/AnimationComponent.js";
import AudioComponent, {
	AudioTypeEnum,
} from "../../Engine/ECS/Components/AudioComponent.js";
import BoundingBoxComponent from "../../Engine/ECS/Components/BoundingBoxComponent.js";
import CollisionComponent from "../../Engine/ECS/Components/CollisionComponent.js";
import DoorComponent from "../../Engine/ECS/Components/DoorComponent.js";
import EnemyComponent from "../../Engine/ECS/Components/EnemyComponent.js";
import GraphicsComponent from "../../Engine/ECS/Components/GraphicsComponent.js";
import HealthComponent from "../../Engine/ECS/Components/HealthComponent.js";
import MeshCollisionComponent from "../../Engine/ECS/Components/MeshCollisionComponent.js";
import MovementComponent from "../../Engine/ECS/Components/MovementComponent.js";
import PointLightComponent from "../../Engine/ECS/Components/PointLightComponent.js";
import PositionComponent from "../../Engine/ECS/Components/PositionComponent.js";
import WeaponComponent, {
	WeaponTypeEnum,
} from "../../Engine/ECS/Components/WeaponComponent.js";
import ECSManager from "../../Engine/ECS/ECSManager.js";
import Entity from "../../Engine/ECS/Entity.js";
import Vec2 from "../../Engine/Maths/Vec2.js";
import Vec3 from "../../Engine/Maths/Vec3.js";
import Mesh from "../../Engine/Objects/Mesh.js";
import Rendering from "../../Engine/Rendering.js";
import { LabyrinthGenerator } from "./LabyrinthGenerator.js";

export interface RoomInformation {
	roomPosition: Vec2;
	active: boolean;
	entityIds: number[];
	floorId: number;
}
export interface MapInformation {
	rooms: RoomInformation[];
	pointLightEntities: Entity[];
}

enum SpawnPointsEnum {
	UP_LEFT,
	UP_RIGHT,
	MIDDLE,
	DOWN_LEFT,
	DOWN_RIGHT,
}

const ROOM_WIDTH = 8.0;
const SPAWN_CHANCE = 0.3; //0-1 used to determine if a monster should spawn or not

export module MapGenerator {
	export async function GenerateMap(
		xSize: number,
		ySize: number,
		ecsManager: ECSManager,
		rendering: Rendering
	) {
		let labyrinth = LabyrinthGenerator.getLabyrinth(xSize, ySize);
		const mapInformation: MapInformation = {
			rooms: [],
			pointLightEntities: [],
		};
		for (let y = 1; y < labyrinth.length - 1; y += 2) {
			for (let x = 1; x < labyrinth[y].length - 1; x += 2) {
				if (labyrinth[x][y] == 0) {
					const roomInformation = await createRoom(
						labyrinth,
						x,
						y,
						ecsManager,
						rendering
					);
					mapInformation.rooms.push(roomInformation);
				}
			}
		}

		for (let i = -3; i < 4; i++) {
			for (let j = -2; j < 3; j++) {
				mapInformation.pointLightEntities.push(
					createPointLightEntity(
						new Vec3({ x: 0.15, y: 0.06, z: 0.08 }),
						new Vec3({ x: i, y: 1.5, z: j + 0.5 }),
						ecsManager,
						rendering
					)
				);
			}
		}

		return mapInformation;
	}

	async function createRoom(
		map: Array<Array<number>>,
		roomTileX: number,
		roomTileY: number,
		ecsManager: ECSManager,
		rendering: Rendering
	) {
		const roomPosition = new Vec2({ x: roomTileX, y: roomTileY });
		const isStartingRoom = roomTileX === 1 && roomTileY === 1;
		const isBossRoom = roomTileX === 9 && roomTileY === 9;

		// Find out how the room should look
		let wallsTowards = [
			map[roomTileX][roomTileY - 1] > 0 ? true : false,
			map[roomTileX][roomTileY + 1] > 0 ? true : false,
			map[roomTileX - 1][roomTileY] > 0 ? true : false,
			map[roomTileX + 1][roomTileY] > 0 ? true : false,
		];

		const floorTexturePaths = [
			"Assets/textures/stone.png",
			"Assets/textures/stone_moss.png",
		];

		let roomCenter = new Vec3({
			x: (roomTileX - 1) * 0.5,
			y: 0.0,
			z: (roomTileY - 1) * 0.5,
		}).multiply(ROOM_WIDTH);

		const floorId = createFloorEntity(
			new Vec3(roomCenter),
			floorTexturePaths[Math.floor(Math.random() * 2.0)],
			ecsManager,
			rendering
		);

		let enemyIds = [];
		if (!isStartingRoom && !isBossRoom) {
			Object.values(SpawnPointsEnum).forEach((spawnPoint) => {
				if (isNaN(Number(spawnPoint))) return;
				const spawnLocation = new Vec3(roomCenter);
				if (Math.random() < SPAWN_CHANCE) {
					switch (spawnPoint) {
						case SpawnPointsEnum.UP_LEFT:
							spawnLocation.x -= ROOM_WIDTH / 2 - 2.0;
							spawnLocation.z -= ROOM_WIDTH / 2 - 2.0;
							break;
						case SpawnPointsEnum.UP_RIGHT:
							spawnLocation.x += ROOM_WIDTH / 2 - 2.0;
							spawnLocation.z -= ROOM_WIDTH / 2 - 2.0;
							break;
						case SpawnPointsEnum.DOWN_LEFT:
							spawnLocation.x -= ROOM_WIDTH / 2 - 2.0;
							spawnLocation.z += ROOM_WIDTH / 2 - 2.0;
							break;
						case SpawnPointsEnum.DOWN_RIGHT:
							spawnLocation.x += ROOM_WIDTH / 2 - 2.0;
							spawnLocation.z += ROOM_WIDTH / 2 - 2.0;
							break;
						//MIDDLE is left out so monster will spawn in center
					}

					const enemyId = createEnemyEntity(
						spawnLocation,
						false,
						ecsManager,
						rendering
					);
					enemyIds.push(enemyId);
				}
			});
		} else if (isBossRoom) {
			const enemyId = createEnemyEntity(
				new Vec3(roomCenter),
				false,
				ecsManager,
				rendering,
				true
			);
			enemyIds.push(enemyId);
		}

		createDoorEntity(new Vec3(roomCenter), ecsManager, rendering, wallsTowards);

		const roomInformation: RoomInformation = {
			roomPosition: roomPosition,
			active: false,
			entityIds: enemyIds,
			floorId: floorId,
		};

		await createWallEntities(
			new Vec3(roomCenter),
			ecsManager,
			rendering,
			wallsTowards,
			isStartingRoom,
			roomInformation
		);
		return roomInformation;
	}

	function createEnemyEntity(
		position: Vec3,
		isActive: boolean,
		ecsManager: ECSManager,
		rendering: Rendering,
		boss: boolean = false
	): number {
		let enemyKey = EnemyTypesEnum.SLIME;
		if (boss) {
			enemyKey = EnemyTypesEnum.WITCH;
		} else {
			const enemyEnumKeys = Object.values(EnemyTypesEnum);
			const enemyEnumKeyIndex = Math.floor(
				Math.random() * (enemyEnumKeys.length - 1) //-1 to avoid hitting witch
			);
			enemyKey = enemyEnumKeys[enemyEnumKeyIndex];
		}
		const enemyData = EnemyData[enemyKey];

		let enemyTexture = enemyData.texturePath;
		const enemyEntity = ecsManager.createEntity();
		enemyEntity.isActive = isActive;

		let phongQuad = rendering.getNewPhongQuad(enemyTexture, enemyTexture);
		phongQuad.modelMatrix.setTranslate(0.0, -10.0, 0.0);
		ecsManager.addComponent(enemyEntity, new GraphicsComponent(phongQuad));

		let enemyMoveComp = new MovementComponent(enemyData.acceleration);
		ecsManager.addComponent(enemyEntity, enemyMoveComp);

		let enemyPosComp = new PositionComponent(position);
		enemyPosComp.rotation.setValues(-30.0, 0.0, 0.0);
		if (enemyKey === EnemyTypesEnum.DRYAD) {
			enemyPosComp.scale.y = 1.5;
		} else if (enemyKey === EnemyTypesEnum.WITCH) {
			enemyPosComp.scale.y = 1.0;
		}
		ecsManager.addComponent(enemyEntity, enemyPosComp);

		// Update the wall model matrix to avoid it being stuck on 0,0 if inactive
		enemyPosComp.calculateMatrix(phongQuad.modelMatrix);

		let enemyAnimComp = new AnimationComponent();

		enemyAnimComp.spriteMap.setNrOfSprites(
			enemyKey === EnemyTypesEnum.WITCH ? 6 : 3,
			enemyKey === EnemyTypesEnum.DRYAD || enemyKey === EnemyTypesEnum.WITCH
				? enemyKey === EnemyTypesEnum.DRYAD
					? 1
					: 6
				: 2
		);
		enemyAnimComp.startingTile = { x: 0, y: 0 };
		enemyAnimComp.advanceBy = { x: 1.0, y: 0.0 };
		enemyAnimComp.modAdvancement = {
			x: 2.0,
			y: 1.0,
		};
		enemyAnimComp.updateInterval = 0.3;
		ecsManager.addComponent(enemyEntity, enemyAnimComp);

		ecsManager.addComponent(enemyEntity, new EnemyComponent(enemyKey));
		ecsManager.addComponent(
			enemyEntity,
			new WeaponComponent(
				enemyData.damage,
				enemyData.shoots,
				enemyData.range,
				enemyData.projectileSpeed,
				enemyData.attackCooldown,
				enemyData.weaponType,
				10
			)
		);
		ecsManager.addComponent(enemyEntity, new HealthComponent(enemyData.health));

		// Collision for enemy
		let enemyBBComp = new BoundingBoxComponent();
		enemyBBComp.boundingBox.setMinAndMaxVectors(
			new Vec3({ x: -0.2, y: -0.5, z: -0.2 }),
			new Vec3({ x: 0.2, y: 0.5, z: 0.2 })
		);
		enemyBBComp.updateBoundingBoxBasedOnPositionComp = true;
		ecsManager.addComponent(enemyEntity, enemyBBComp);
		ecsManager.addComponent(enemyEntity, new CollisionComponent());

		ecsManager.addComponent(
			enemyEntity,
			new AudioComponent([
				{
					key: AudioTypeEnum.SHOOT,
					audioKey: enemyData.attackSound,
					playTime: 1.5,
				},
				{
					key: AudioTypeEnum.DEATH,
					audioKey: enemyData.deathSound,
					playTime: 2,
				},
			])
		);

		return enemyEntity.id;
	}

	function createFloorEntity(
		position: Vec3,
		texturePath: string,
		ecsManager: ECSManager,
		rendering: Rendering
	) {
		let floorEntity = ecsManager.createEntity();
		let phongQuad = rendering.getNewPhongQuad(
			texturePath,
			"Assets/textures/black.png"
		);
		phongQuad.textureMatrix.setScale(ROOM_WIDTH, ROOM_WIDTH, 1.0);
		ecsManager.addComponent(floorEntity, new GraphicsComponent(phongQuad));
		let posComp = new PositionComponent(
			position.subtract(new Vec3({ x: 0.0, y: 0.5, z: 0.0 }))
		);
		posComp.rotation.setValues(-90.0, 0.0, 0.0);
		posComp.scale.setValues(ROOM_WIDTH, ROOM_WIDTH, 1.0);
		ecsManager.addComponent(floorEntity, posComp);

		// Collision stuff
		let floorBoundingBoxComp = new BoundingBoxComponent();
		floorBoundingBoxComp.updateBoundingBoxBasedOnPositionComp = true;
		floorBoundingBoxComp.boundingBox.setMinAndMaxVectors(
			new Vec3({ x: -4.0, y: -5.0, z: -4.0 }),
			new Vec3({ x: 4.0, y: 0.0, z: 4.0 })
		);
		ecsManager.addComponent(floorEntity, floorBoundingBoxComp);
		let collComp = new CollisionComponent();
		collComp.isStatic = true;
		ecsManager.addComponent(floorEntity, collComp);

		return floorEntity.id;
	}

	async function createDoorEntity(
		position: Vec3,
		ecsManager: ECSManager,
		rendering: Rendering,
		wallsTowards: boolean[]
	) {
		for (let i = 1; i < wallsTowards.length; i += 2) {
			if (wallsTowards[i]) {
				continue;
			}
			const objPath = "Assets/objs/cube.obj";
			const doorTexture = "Assets/textures/door.png";

			let doorEntity = ecsManager.createEntity();
			let doorMesh = await rendering.getNewMesh(
				objPath,
				doorTexture,
				doorTexture
			);
			ecsManager.addComponent(doorEntity, new GraphicsComponent(doorMesh));
			let posComp = new PositionComponent(
				new Vec3(position).add(new Vec3({ x: 0.0, y: 0.5, z: 0.0 }))
			);

			if (i == 1) {
				posComp.position.add(new Vec3({ x: 0.0, y: 0.0, z: 4.0 }));
			}
			if (i == 3) {
				posComp.position.add(new Vec3({ x: 4.0, y: 0.0, z: 0.0 }));
				posComp.rotation.setValues(0.0, -90.0);
			}

			posComp.scale.setValues(0.7, 1.0, 0.07);
			ecsManager.addComponent(doorEntity, posComp);

			// Collision stuff
			let boxBoundingBoxComp = new BoundingBoxComponent();
			boxBoundingBoxComp.setup(doorMesh);
			boxBoundingBoxComp.updateTransformMatrix(doorMesh.modelMatrix);
			ecsManager.addComponent(doorEntity, boxBoundingBoxComp);
			let collComp = new CollisionComponent();
			collComp.isStatic = true;
			collComp.hasForce = false;
			ecsManager.addComponent(doorEntity, collComp);

			ecsManager.addComponent(doorEntity, new DoorComponent());
		}
	}

	async function createWallEntities(
		position: Vec3,
		ecsManager: ECSManager,
		rendering: Rendering,
		wallsTowards: boolean[],
		isActive: boolean,
		roomInformation: RoomInformation
	) {
		for (let i = 0; i < wallsTowards.length; i++) {
			let objPath = "Assets/objs/WallWithOpening.obj";
			if (wallsTowards[i]) {
				objPath = "Assets/objs/WallWithoutOpening.obj";
			}

			let entity = ecsManager.createEntity();
			const texturePath = [
				"Assets/textures/wall.png",
				"Assets/textures/wall2.png",
			];

			let rand = Math.floor(Math.random() * 2.0);

			let wallMesh = (await rendering.getNewMesh(
				objPath,
				texturePath[rand],
				texturePath[rand]
			)) as Mesh;

			wallMesh.textureMatrix.scale(8.0, 1.0, 1.0);

			ecsManager.addComponent(entity, new GraphicsComponent(wallMesh));
			let posComp = new PositionComponent(
				new Vec3(position).subtract(new Vec3({ x: 0.0, y: 0.5, z: 0.0 }))
			);

			if (i == 0) {
				posComp.position.add(new Vec3({ x: 0.0, y: 0.0, z: -4.1 }));
			} else if (i == 1) {
				posComp.position.add(new Vec3({ x: 0.0, y: 0.0, z: 4.1 }));
			} else if (i == 2) {
				posComp.position.add(new Vec3({ x: -4.1, y: 0.0, z: 0.0 }));
				posComp.rotation.setValues(0.0, 90.0);
			} else if (i == 3) {
				posComp.position.add(new Vec3({ x: 4.1, y: 0.0, z: 0.0 }));
				posComp.rotation.setValues(0.0, -90.0);
			}

			posComp.scale.setValues(1.25, 1.0, 0.5);
			ecsManager.addComponent(entity, posComp);

			// Update the wall model matrix to avoid it being stuck on 0,0 if inactive
			posComp.calculateMatrix(wallMesh.modelMatrix);

			// Collision stuff
			let boxBoundingBoxComp = new BoundingBoxComponent();
			boxBoundingBoxComp.setup(wallMesh);
			boxBoundingBoxComp.updateTransformMatrix(wallMesh.modelMatrix);
			ecsManager.addComponent(entity, boxBoundingBoxComp);
			let collComp = new CollisionComponent();
			collComp.isStatic = true;
			ecsManager.addComponent(entity, collComp);

			let meshCollComp = new MeshCollisionComponent();
			meshCollComp.setup(wallMesh);
			meshCollComp.updateTransformMatrix(wallMesh.modelMatrix);
			ecsManager.addComponent(entity, meshCollComp);

			entity.isActive = isActive;
			roomInformation.entityIds.push(entity.id);
		}
	}

	function createPointLightEntity(
		colour: Vec3,
		pos: Vec3,
		ecsManager: ECSManager,
		rendering: Rendering
	): Entity {
		let pointLightEntity = ecsManager.createEntity();
		let pointLight = rendering.getNewPointLight();
		pointLight.colour.deepAssign(colour);
		pointLight.linear = 0.25;
		pointLight.quadratic = 0.6;

		let pointLightComp = new PointLightComponent(pointLight);
		pointLightComp.posOffset = pos;

		ecsManager.addComponent(pointLightEntity, pointLightComp);
		ecsManager.addComponent(pointLightEntity, new PositionComponent());
		return pointLightEntity;
	}
}
