import ShaderProgram from "./ShaderProgram.js";

const particleVertexShaderSrc: string = `#version 300 es

layout (location = 0) in vec2 inVertexPosition;
layout (location = 1) in vec2 inTexCoords;

// Instanced attributes starts here
layout (location = 2) in vec3 inStartPosition;
layout (location = 3) in float inSize;
layout (location = 4) in vec3 inStartVel;
layout (location = 5) in float inStartTime;
layout (location = 6) in vec3 inConstantAcceleration;
// layout (location = 7) in float padding;

uniform mat4 viewProjMatrix;
uniform vec3 cameraPos;
uniform float currentTime;
uniform float fadePerSecond;
uniform float sizeChangePerSecond;

out vec2 texCoords;
out float alpha;

void main() {
    // Calculate how long this has been alive
    float lifeTime = currentTime - inStartTime;

    // Calculate current position
    vec3 currentPos = inStartPosition + (inStartVel * lifeTime + (inConstantAcceleration * lifeTime) * lifeTime) / 2.0;

    // Billboarding
    vec3 camDir = cameraPos - currentPos;
    vec3 rightVec = normalize(cross(vec3(0.0, 1.0, 0.0), camDir));
    vec3 upVec = normalize(cross(camDir, rightVec));
    rightVec = rightVec * inVertexPosition.x * (inSize + sizeChangePerSecond * lifeTime);
    upVec = upVec * inVertexPosition.y * (inSize + sizeChangePerSecond * lifeTime);
    gl_Position = viewProjMatrix * vec4(rightVec + upVec + currentPos, 1.0);

    // gl_Position = viewProjMatrix * vec4(vec3(inVertexPosition, 0.0) * inSize + currentPos, 1.0); // No billboarding
    texCoords = inTexCoords;
    alpha = max(1.0 - lifeTime * fadePerSecond, 0.0);
}`;

const particleFragmentShaderSrc: string = `#version 300 es
precision highp float;

in vec2 texCoords;
in float alpha;

uniform sampler2D texture0;

out vec4 FragColor;

mat4 thresholdMatrix = mat4(
    1.0, 9.0, 3.0, 11.0,
    13.0, 5.0, 15.0, 7.0,
    4.0, 12.0, 2.0, 10.0,
    16.0, 8.0, 14.0, 6.0
    );

void main()
{
    FragColor = texture(texture0, texCoords);

    FragColor.a = FragColor.a * alpha;
    
    float threshold = thresholdMatrix[int(floor(mod(gl_FragCoord.x, 4.0)))][int(floor(mod(gl_FragCoord.y, 4.0)))] / 17.0;
    if (threshold >= FragColor.a) {
        discard;
    }

    FragColor.a = 1.0f; // Since we use screen door transparency, do not use alpha value
}`;

export default class ParticleShaderProgram extends ShaderProgram {
	constructor(gl: WebGL2RenderingContext) {
		super(
			gl,
			"ParticleShaderProgram",
			particleVertexShaderSrc,
			particleFragmentShaderSrc,
			false
		);

		this.use();

		this.setUniformLocation("texture0");
		this.gl.uniform1i(this.getUniformLocation("texture0")[0], 0);

		this.setUniformLocation("viewProjMatrix");
		this.setUniformLocation("cameraPos");
		this.setUniformLocation("currentTime");
		this.setUniformLocation("fadePerSecond");
		this.setUniformLocation("sizeChangePerSecond");
	}

	setupVertexAttributePointers(): void {
		// Change if input layout changes in shaders
		const stride = 4 * 4;
		this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, stride, 0);
		this.gl.enableVertexAttribArray(0);

		this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, stride, 2 * 4);
		this.gl.enableVertexAttribArray(1);
	}

	setupInstancedVertexAttributePointers(): void {
		const stride = 11 * 4;
		this.gl.vertexAttribPointer(2, 3, this.gl.FLOAT, false, stride, 0);
		this.gl.enableVertexAttribArray(2);
		this.gl.vertexAttribDivisor(2, 1);

		this.gl.vertexAttribPointer(3, 1, this.gl.FLOAT, false, stride, 3 * 4);
		this.gl.enableVertexAttribArray(3);
		this.gl.vertexAttribDivisor(3, 1);

		this.gl.vertexAttribPointer(4, 3, this.gl.FLOAT, false, stride, 4 * 4);
		this.gl.enableVertexAttribArray(4);
		this.gl.vertexAttribDivisor(4, 1);

		this.gl.vertexAttribPointer(5, 1, this.gl.FLOAT, false, stride, 7 * 4);
		this.gl.enableVertexAttribArray(5);
		this.gl.vertexAttribDivisor(5, 1);

		this.gl.vertexAttribPointer(6, 3, this.gl.FLOAT, false, stride, 8 * 4);
		this.gl.enableVertexAttribArray(6);
		this.gl.vertexAttribDivisor(6, 1);

		// this.gl.vertexAttribPointer(7, 1, this.gl.FLOAT, false, stride, 11 * 4);
		// this.gl.enableVertexAttribArray(7);
		// this.gl.vertexAttribDivisor(7, 1);
	}
}
