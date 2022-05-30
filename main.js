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

    walls = [
        new Wall(0),
        //new Wall(cvs.height)
    ]

    window.setInterval(updateSim, 10)
}


function updateSim() {
    if(!block) return
    block.updateSim()
    block.updateForce(updateWalls())
}


function updateWalls() {
    if(!walls) return 0
    let f = [0]

    for(let wall of walls) {
        f.push(wall.getForce(block.y, block.v))
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
    h = 200
    d = 0

    y = 100
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
        this.d = y - this.y

        if(y > this.y && y < this.y + this.h) {
            this.touching = true
        }
    }

    release(y) {
        this.touching = false
    }

    move(y) {
        if(!this.touching) return
        this.y = y - this.d
        this.updateTouchState()
    }

    updateTouchState() {
        const t = window.performance.now()
        this.measureVelocity(t)
        this.updateLastTouch(t)
    }

    measureVelocity(t) {
        this.v = (this.y - this.last.y) / (t - this.last.t)
    }

    updateLastTouch(t) {
        this.last.y = this.y
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
        this.y = this.y + (this.v * dt)
        
        //if(this.y < 0 && this.v < 0) this.v = this.v * -1
        if(this.y > cvs.height - 200 && this.v > 0) this.v = this.v * -0.7
    }

    updateMotion(dt) {
        this.v = this.v + this.a * dt
        this.a = this.f / this.m
        if(this.y > cvs.height - 200 && this.v > 0) this.v = 0
    }

    updateForce(f) {
        this.f = f
    }

    draw() {
        ctx.beginPath()
        ctx.rect(0, this.y, cvs.width, this.h)
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

    constructor(y) {
        this.y = y
    }

    getForce(y, v) {
        const d = y - this.y
        return (-0.002 * d) + (-0.1 * v)
    }
}