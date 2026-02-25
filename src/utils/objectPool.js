// objectPool.js — Phase 3b: Object pooling for temporary entities
// Reduces garbage collection pressure by reusing particle and projectile objects

/**
 * Object pool class for reusing temporary entities
 * Maintains a pool of reusable objects to avoid allocation/deallocation overhead
 */
class ObjectPool {
  constructor(initialCapacity = 100, objectFactory) {
    this.available = [];
    this.factory = objectFactory;
    
    // Pre-allocate pool with initial capacity
    for (let i = 0; i < initialCapacity; i++) {
      this.available.push(objectFactory());
    }
  }
  
  /**
   * Acquire an object from the pool, creating new ones if needed
   * @returns {Object} A reusable object (new or recycled)
   */
  acquire() {
    if (this.available.length > 0) {
      return this.available.pop();
    }
    // Pool exhausted, create new object
    return this.factory();
  }
  
  /**
   * Return an object to the pool for reuse
   * @param {Object} obj - Object to return to pool
   */
  release(obj) {
    // Reset object properties to prevent stale state
    this._resetObject(obj);
    this.available.push(obj);
  }
  
  /**
   * Reset object properties (override in subclasses if needed)
   * @param {Object} obj - Object to reset
   */
  _resetObject(obj) {
    // Default: clear properties
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && key !== 'constructor') {
        delete obj[key];
      }
    }
  }
  
  /**
   * Get current pool statistics
   * @returns {Object} Pool stats (available, total)
   */
  getStats() {
    return {
      available: this.available.length,
      total: this.available.length,  // Note: doesn't track active objects
    };
  }
}

/**
 * Particle-specific object pool with optimized reset
 */
class ParticlePool extends ObjectPool {
  constructor(initialCapacity = 300) {
    super(initialCapacity, () => ({}));
  }
  
  _resetObject(obj) {
    // Reset all properties for particle reuse
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        delete obj[key];
      }
    }
  }
}

/**
 * Projectile-specific object pool
 */
class ProjectilePool extends ObjectPool {
  constructor(initialCapacity = 50) {
    super(initialCapacity, () => ({}));
  }
  
  _resetObject(obj) {
    // Reset projectile properties
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && key !== 'hitEnemies') {
        delete obj[key];
      }
    }
    // Reuse Set if it exists for pierce tracking
    if (obj.hitEnemies instanceof Set) {
      obj.hitEnemies.clear();
    }
  }
}

// --- GLOBAL POOLS ---
export const particlePool = new ParticlePool(300);
export const fireballPool = new ProjectilePool(50);
export const bombPool = new ProjectilePool(30);
export const projectilePool = new ProjectilePool(100);  // Generic pool for arrows, bolts, orbs

/**
 * Create a particle object from pool with initial properties
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @param {number} vx - Velocity X
 * @param {number} vy - Velocity Y
 * @param {number} life - Particle lifetime
 * @param {number} maxLife - Maximum lifetime
 * @param {string} color - Particle color
 * @param {number} size - Particle size
 * @returns {Object} Initialized particle object
 */
export function createParticle(x, y, vx, vy, life, maxLife, color, size) {
  const p = particlePool.acquire();
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.life = life;
  p.maxLife = maxLife;
  p.color = color;
  p.size = size;
  return p;
}

/**
 * Return a particle to the pool
 * @param {Object} particle - Particle object to reuse
 */
export function releaseParticle(particle) {
  particlePool.release(particle);
}

/**
 * Create a projectile object from pool (generic)
 * @returns {Object} Empty projectile object ready for initialization
 */
export function acquireProjectile() {
  return projectilePool.acquire();
}

/**
 * Return a projectile to the pool
 * @param {Object} projectile - Projectile to reuse
 */
export function releaseProjectile(projectile) {
  projectilePool.release(projectile);
}

/**
 * Create a fireball from pool
 * @returns {Object} Fireball object
 */
export function acquireFireball() {
  return fireballPool.acquire();
}

/**
 * Return a fireball to pool
 * @param {Object} fireball - Fireball to reuse
 */
export function releaseFireball(fireball) {
  fireballPool.release(fireball);
}

/**
 * Create a bomb from pool
 * @returns {Object} Bomb object
 */
export function acquireBomb() {
  return bombPool.acquire();
}

/**
 * Return a bomb to pool
 * @param {Object} bomb - Bomb to reuse
 */
export function releaseBomb(bomb) {
  bombPool.release(bomb);
}

/**
 * Batch create particles for common patterns
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @param {string} color - Particle color
 * @param {number} count - Number of particles
 * @returns {Array} Array of initialized particles
 */
export function createParticleBurst(x, y, color, count = 8) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 4;
    particles.push(createParticle(
      x, y,
      Math.cos(angle) * spd,
      Math.sin(angle) * spd - 1,
      30 + Math.random() * 20,
      50,
      color,
      2 + Math.random() * 3
    ));
  }
  return particles;
}
