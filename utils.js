'use strict';

import GLib from 'gi://GLib';

export const get_distance_sqr = (pos1, pos2) => {
  let a = pos1[0] - pos2[0];
  let b = pos1[1] - pos2[1];
  return a * a + b * b;
};

export const get_distance = (pos1, pos2) => {
  return Math.sqrt(get_distance_sqr(pos1, pos2));
};

export const isOverlapRect = (r1, r2) => {
  let [r1x, r1y, r1w, r1h] = r1;
  let [r2x, r2y, r2w, r2h] = r2;
  // are the sides of one rectangle touching the other?
  if (
    r1x + r1w >= r2x && // r1 right edge past r2 left
    r1x <= r2x + r2w && // r1 left edge past r2 right
    r1y + r1h >= r2y && // r1 top edge past r2 bottom
    r1y <= r2y + r2h
  ) {
    // r1 bottom edge past r2 top
    return true;
  }
  return false;
};

export const isInRect = (r, p, pad = 0) => {
  let [x1, y1, w, h] = r;
  let x2 = x1 + w;
  let y2 = y1 + h;
  let [px, py] = p;
  return px + pad >= x1 && px - pad < x2 && py + pad >= y1 && py - pad < y2;
};

export const Vector = class {
  constructor(components = [0, 0, 0]) {
    this.components = [...components];
    while (this.components.length < 3) {
      this.components.push(0);
    }
  }

  // Getter and setter for individual dimensions (x, y, z)
  get x() {
    return this.components[0];
  }

  set x(value) {
    this.components[0] = value;
  }

  get y() {
    return this.components[1];
  }

  set y(value) {
    this.components[1] = value;
  }

  get z() {
    return this.components[2];
  }

  set z(value) {
    this.components[2] = value;
  }

  // Addition of vectors
  add(otherVector) {
    if (this.components.length !== otherVector.components.length) {
      throw new Error('Vectors must be of the same length for addition.');
    }

    const result = [];
    for (let i = 0; i < this.components.length; i++) {
      result.push(this.components[i] + otherVector.components[i]);
    }
    return new Vector(result);
  }

  // Subtraction of vectors
  subtract(otherVector) {
    if (this.components.length !== otherVector.components.length) {
      throw new Error('Vectors must be of the same length for subtraction.');
    }

    const result = [];
    for (let i = 0; i < this.components.length; i++) {
      result.push(this.components[i] - otherVector.components[i]);
    }
    return new Vector(result);
  }

  // Dot product of vectors
  dotProduct(otherVector) {
    if (this.components.length !== otherVector.components.length) {
      throw new Error('Vectors must be of the same length for dot product.');
    }

    let result = 0;
    for (let i = 0; i < this.components.length; i++) {
      result += this.components[i] * otherVector.components[i];
    }
    return result;
  }

  // Scalar multiplication of vectors
  multiplyScalar(scalar) {
    const result = this.components.map((component) => component * scalar);
    return new Vector(result);
  }

  // Cross product of vectors (for 3-dimensional vectors)
  crossProduct(otherVector) {
    if (this.components.length !== 3 || otherVector.components.length !== 3) {
      throw new Error(
        'Cross product is only defined for 3-dimensional vectors.'
      );
    }

    const [x1, y1, z1] = this.components;
    const [x2, y2, z2] = otherVector.components;

    const result = [y1 * z2 - z1 * y2, z1 * x2 - x1 * z2, x1 * y2 - y1 * x2];

    return new Vector(result);
  }

  // Magnitude (length) of the vector
  magnitude() {
    return Math.sqrt(this.components.reduce((acc, val) => acc + val ** 2, 0));
  }

  // Normalize the vector
  normalize() {
    const mag = this.magnitude();
    if (mag === 0) {
      throw new Error('Cannot normalize the zero vector.');
    }
    return this.multiplyScalar(1 / mag);
  }

  // Inverse the vector
  inverse() {
    const invertedComponents = this.components.map((component) => -component);
    return new Vector(invertedComponents);
  }

  // Angle between two vectors (in radians)
  angleBetween(otherVector) {
    const dotProd = this.dotProduct(otherVector);
    const mag1 = this.magnitude();
    const mag2 = otherVector.magnitude();
    return Math.acos(dotProd / (mag1 * mag2));
  }

  // Create a vector from an angle (in radians) and an optional magnitude
  fromAngle(angle, magnitude = 1) {
    const x = magnitude * Math.cos(angle);
    const y = magnitude * Math.sin(angle);
    return new Vector([x, y]);
  }
};
