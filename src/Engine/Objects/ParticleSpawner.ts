import { applicationStartTime } from "../../main.js";

import GraphicsObject from "./GraphicsObject.js";
import Texture from "../Textures/Texture.js";
import Vec3 from "../Maths/Vec3.js";
import ShaderProgram from "../ShaderPrograms/ShaderProgram.js";

export default class ParticleSpawner extends GraphicsObject {
	texture: Texture;
	fadePerSecond: number;
	sizeChangePerSecond: number;

	// Private
	private numParticles: number;
	private vertices: Float32Array;
	private indices: Int32Array;
	private instanceVBO: WebGLBuffer;

	constructor(
		gl: WebGL2RenderingContext,
		shaderProgram: ShaderProgram,
		texture: Texture,
		numberOfStartingParticles: number = 0
	) {
		super(gl, shaderProgram);

		this.texture = texture;

		this.bindVAO();
		this.instanceVBO = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			numberOfStartingParticles * 11 * 4,
			this.gl.DYNAMIC_DRAW
		);
		shaderProgram.setupInstancedVertexAttributePointers();
		this.unbindVAO();

		// prettier-ignore
		this.vertices = new Float32Array([ 
            // positions  // uv
            -0.5,  0.5,   0.0, 1.0,
            -0.5, -0.5,   0.0, 0.0,
             0.5, -0.5,   1.0, 0.0,
             0.5,  0.5,   1.0, 1.0,
        ]);

		// prettier-ignore
		this.indices = new Int32Array([
            0, 1, 2,
            0, 2, 3,
        ]);
		this.setVertexData(this.vertices);
		this.setIndexData(this.indices);

		// All starting particles are initialized as size and position 0, so they wont be visable unless manually changed
		this.numParticles = numberOfStartingParticles;

		this.fadePerSecond = 0.0;
		this.sizeChangePerSecond = 1.0;
	}

	setNumParticles(amount: number) {
		this.numParticles = amount;

		this.bindVAO();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			this.numParticles * 11 * 4,
			this.gl.DYNAMIC_DRAW
		);
		this.unbindVAO();
	}

	getNumberOfParticles(): number {
		return this.numParticles;
	}

	setParticleData(
		particleIndex: number,
		startPosition: Vec3,
		size: number,
		startVel: Vec3,
		acceleration: Vec3
	): boolean {
		if (particleIndex > this.numParticles) {
			return false;
		}

		let data = new Float32Array([
			startPosition.x,
			startPosition.y,
			startPosition.z,
			size,
			startVel.x,
			startVel.y,
			startVel.z,
			(Date.now() - applicationStartTime) * 0.001,
			acceleration.x,
			acceleration.y,
			acceleration.z,
		]);

		this.bufferSubDataUpdate(particleIndex * 11, data);

		return true;
	}

	setParticleStartPosition(particleIndex: number, position: Vec3): boolean {
		if (particleIndex > this.numParticles) {
			return false;
		}
		this.bufferSubDataUpdate(
			particleIndex * 11,
			new Float32Array(position.elements())
		);
		return true;
	}

	setParticleSize(particleIndex: number, size: number): boolean {
		if (particleIndex > this.numParticles) {
			return false;
		}
		this.bufferSubDataUpdate(particleIndex * 11 + 3, new Float32Array([size]));
		return true;
	}

	setParticleStartVelocity(particleIndex: number, vel: Vec3): boolean {
		if (particleIndex > this.numParticles) {
			return false;
		}
		this.bufferSubDataUpdate(
			particleIndex * 11 + 4,
			new Float32Array(vel.elements())
		);
		return true;
	}

	setParticleStartTime(particleIndex: number, time: number): boolean {
		if (particleIndex > this.numParticles) {
			return false;
		}
		this.bufferSubDataUpdate(particleIndex * 11 + 7, new Float32Array([time]));
		return true;
	}

	resetParticleStartTime(particleIndex: number): boolean {
		if (particleIndex > this.numParticles) {
			return false;
		}
		this.bufferSubDataUpdate(
			particleIndex * 11 + 7,
			new Float32Array([(Date.now() - applicationStartTime) * 0.001])
		);
		return true;
	}

	setParticleAcceleration(particleIndex: number, acc: Vec3): boolean {
		if (particleIndex > this.numParticles) {
			return false;
		}
		this.bufferSubDataUpdate(
			particleIndex * 11 + 8,
			new Float32Array(acc.elements())
		);
		return true;
	}

	private bufferSubDataUpdate(start: number, data: Float32Array): boolean {
		if (start > this.numParticles * 11) {
			return false;
		}
		this.bindVAO();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, start * 4, data);
		this.unbindVAO();
		return true;
	}

	draw() {
		this.bindVAO();

		this.texture.bind(0);
		this.gl.uniform1f(
			this.shaderProgram.getUniformLocation("fadePerSecond")[0],
			this.fadePerSecond
		);
		this.gl.uniform1f(
			this.shaderProgram.getUniformLocation("sizeChangePerSecond")[0],
			this.sizeChangePerSecond
		);

		this.gl.drawElementsInstanced(
			this.gl.TRIANGLES,
			6,
			this.gl.UNSIGNED_INT,
			0,
			this.getNumberOfParticles()
		);
		this.unbindVAO();
	}
}
