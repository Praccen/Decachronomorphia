import { Component, ComponentTypeEnum } from "./Component.js";
import Vec3 from "../../Maths/Vec3.js";

export default class MovementComponent extends Component {
	constantAcceleration: Vec3;
	accelerationDirection: Vec3;
	acceleration: number;
	velocity: Vec3;
	drag: number;

	constructor(acceleration = 10.0) {
		super(ComponentTypeEnum.MOVEMENT);
		this.constantAcceleration = new Vec3({ x: 0.0, y: -9.8, z: 0.0 });
		this.accelerationDirection = new Vec3();
		this.acceleration = acceleration;
		this.drag = 2.5;
		this.velocity = new Vec3();
	}
}
