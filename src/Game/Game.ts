import Rendering from "../Engine/Rendering.js";
import ECSManager from "../Engine/ECS/ECSManager.js";
import Player from "./Player.js";

export default class Game {
	private rendering: Rendering;
	private ecsManager: ECSManager;

	private playerObject: Player;

	constructor(rendering: Rendering, ecsManager: ECSManager) {
		this.rendering = rendering;
		this.ecsManager = ecsManager;

		this.rendering.camera.setPosition(0.0, 0.0, 5.5);

		this.playerObject = new Player(this.rendering, this.ecsManager);
	}

	async init() {
		this.rendering.clearColour = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };

		// ---- Lights ----
		this.rendering.getDirectionalLight().ambientMultiplier = 0.0;
		this.rendering.getDirectionalLight().colour.setValues(0.05, 0.05, 0.05);
		// ----------------

		this.playerObject.init();
	}

	update(dt: number) {
		this.playerObject.update(dt);
	}
}
