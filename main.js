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
    let f = [0.1]

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
    h = 150
    d = 0

    y = [100, 100]
    v = 0
    a = 0
    t = [0, 1]

    f = 0
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
        this.a = this.f / this.m
    }

    updateForce(f) {
        this.f = f
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
    triggers
    latched = false

    constructor(options) {
        const y = options.y
        this.y = y < 0 ? cvs.height + y : y

        this.k = options.k
        this.c = options.c

        this.triggers = options.triggers
    }

    update(y, v, h) {
        this.updateLatchState(y, v, h)
        if(!this.latched) return 0

        const d = y[1] - this.y
        return (-1 * this.k * d) + (-1 * this.c * v)
    }

    updateLatchState(y, v, h) {
        if(!this.latched && this.latch(y, v, h)) {
            this.latched = true
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
            if(Math.sign(v) !== trigger.v) return false

            if(this.checkForwardTrigger(y, trigger, h)) return true
            if(this.checkReverseTrigger(y, trigger, h)) return true
        }

        return false
    }

    checkForwardTrigger(y, trigger, h) {
        if(trigger.v < 0) return false

        const ref = this.y + trigger.y
        return y[0] < ref && y[1] > ref
    }

    checkReverseTrigger(y, trigger, h) {
        if(trigger.v > 0) return false

        const ref = this.y + trigger.y
        return y[0] > ref && y[1] < ref
    }
}