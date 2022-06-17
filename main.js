import config from './config.js'
let cvs, ctx, mid, block, walls


window.onload       = start
window.onresize     = resizeCanvas
window.onmousedown  = touchBlock
window.ontouchstart = touchBlock
window.onmousemove  = moveBlock
window.ontouchmove  = moveBlock
window.onmouseup    = releaseBlock
window.ontouchend   = releaseBlock


function start() {
    initCanvas()
    block = new Block()
    createWalls()
    window.setInterval(updateSim, 10)
}


function createWalls() {
    walls = []

    for(let options of config.walls) {
        walls.push(new Wall(options))
    }
}


function updateSim() {
    if(!block) return
    block.updateSim()
    block.updateForce(updateWalls())
}


function updateWalls() {
    if(!walls) return 0
    let f = [0.035]

    for(let wall of walls) {
        f.push(wall.update(block.y, block.v, block.h))
    }

    const total = f.reduce((partial, f) => partial + f, 0)
    return total
}


function initCanvas() {
    cvs = document.getElementById('cvs')
    ctx = cvs.getContext('2d')
    resizeCanvas()
}


function resizeCanvas() {
    cvs.width  = window.innerWidth + 10
    cvs.height = window.innerHeight

    updateCanvas()
    mid = cvs.height / 2
}


function updateCanvas() {
    clearCanvas()
    if(block) block.draw()
    window.requestAnimationFrame(updateCanvas)
}


function clearCanvas() {
    ctx.clearRect(0, 0, cvs.width, cvs.height)
}


function touchBlock(e) {
    const y = getTouchY(e)
    if(block) block.touch(y)
}


function moveBlock(e) {
    const y = getTouchY(e)
    if(block) block.move(y)
}


function releaseBlock(e) {
    const y = getTouchY(e)
    if(block) block.release(y)
}


function getTouchY(e) {
    const y = e.clientY
    if(y !== undefined && y) return y

    if(e.touches.length == 0) return null
    const touch = e.touches[0]
    return touch.clientY
}


class Block {
    h = 100
    d = 0

    y = [100, 100]
    v =  0
    a =  0
    t = [0, 1]

    f = [0, 0]
    m = 10

    last = { y: 0, t: 0 }

    colors = {
        normal: '#808080',
        touch:  '#000000'
    }

    touching = false

    touch(y) {
        this.d = y - this.y[1]

        if(y > this.y[1] && y < this.y[1] + this.h) {
            this.touching = true
        }
    }

    release(y) {
        this.touching = false
    }

    move(y) {
        if(!this.touching) return
        this.y.shift()
        this.y.push(y - this.d)
        this.updateTouchState()
    }

    updateTouchState() {
        const t = window.performance.now()
        this.measureVelocity(t)
        this.updateLastTouch(t)
    }

    measureVelocity(t) {
        this.v = (this.y[1] - this.last.y) / (t - this.last.t)
    }

    updateLastTouch(t) {
        this.last.y = this.y[1]
        this.last.t = t
    }

    updateSim() {
        this.updateTime()
        if(this.touching) return

        const dt = this.t[1] - this.t[0]
        this.updatePosition(dt)
        this.updateMotion(dt)
    }

    updateTime() {
        this.t.shift()
        this.t.push(window.performance.now())
    }

    updatePosition(dt) {
        this.y.shift()
        this.y.push(this.y[0] + (this.v * dt))
    }

    updateMotion(dt) {
        this.v = this.v + this.a * dt
        this.a = this.getForce() / this.m
    }

    getForce() {
        return (this.f[0] + this.f[1]) / 2
    }

    updateForce(f) {
        this.f.shift()
        this.f.push(f)
    }

    draw() {
        ctx.beginPath()
        ctx.rect(0, this.y[1], cvs.width, this.h)
        ctx.fillStyle = this.getColor()
        ctx.fill()
    }

    getColor() {
        const name = this.touching ? 'touch' : 'normal'
        return this.colors[name]
    }
}


class Wall {
    y
    k
    c
    trigger
    triggers
    latched = false
    offset  = 0

    constructor(options) {
        const y = options.y
        this.y = y < 0 ? cvs.height + y : y

        this.k = options.k
        this.c = options.c

        this.trigger  = options.trigger
        this.triggers = options.triggers
    }

    update(y, v, h) {
        this.offset  = this.updateLatchOffset(h)
        this.latched = this.updateLatchState(y)
        if(!this.latched) return 0

        const d = (y[1] + this.offset) - this.y
        return (-1 * this.k * d) + (-1 * this.c * v)
    }

    updateLatchState(y) {
        const dir = this.trigger.dir
        const ref = y[1] + this.offset

        if(dir === 'fwd') return ref > this.y
        if(dir === 'rev') return ref < this.y

        const low  = this.y - this.trigger.y
        const high = this.y + this.trigger.y
        
        return ref > low && ref < high 
    }

    updateLatchOffset(h) {
        const dir = this.trigger.dir
        
        if(dir === 'fwd') return h
        if(dir === 'rev') return 0
        return h / 2
    }

    updateLatchStateObsolete(y, v, h) {
        if(!this.latched && this.latch(y, v, h)) {
            this.latched = true
            this.offset  = v > 0 ? h : 0
            return
        }

        if(this.latched && this.release(y, v, h)) {
            this.latched = false
        }
    }

    latch(y, v, h) {
        return this.checkTriggers('latch', y, v, h)
    }

    release(y, v, h) {
        return this.checkTriggers('release', y, v, h)
    }

    checkTriggers(type, y, v, h) {
        for(let trigger of this.triggers[type]) {
            if(v === 0) return false
            if(Math.sign(v) !== trigger.v) continue
    
            const ref = this.y + trigger.y
            const off = this.getTriggerOffset(type, v, h)
            if(this.between(type, y, off, ref)) return true
        }

        return false
    }

    getTriggerOffset(type, v, h) {
        if(type === 'latch') {
            return v > 0 ? h : 0
        }

        if(type === 'release') {
            return this.offset
        }

        return 0
    }

    between(type, y, offset, ref) {
        const high = Math.max(...y) + offset
        const low  = Math.min(...y) + offset
        
        return ref > low && ref < high
    }
}