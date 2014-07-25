// pretend jquery syntax sugar
var $ = function(node) {
	if (typeof(node) === "string") // node is a selector
		return document.querySelector(node);
	else
		return {
			on: node.addEventListener.bind(node),
			off: node.removeEventListener.bind(node)
		}
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value))
}

function withMouse(node, fn) {
	return function (event) {
		event.preventDefault()
		fn(event.pageX - node.offsetLeft, event.pageY - node.offsetTop)
	}
}
function withTouch(node, fn) {
	return function (event) {
		event.preventDefault()
		var touch = event.targetTouches[0]
		fn(touch.pageX - node.offsetLeft, touch.pageY - node.offsetTop)
	}
}
var MOUSE = 0
var TOUCH = 1
// a canvas with event handlers for click/hold/drag mouse and touch interaction
function DrawingCanvas(canvas, onresize, noClamp) {
	this.canvas = canvas;
	this.doClamp = false /*!noClamp*/
	this.setDrawFn(function (xOld,yOld,x,y) {
		console.log(xOld,yOld," to ",x,y)
	})
	this.setHoldFn(function(x,y){
		console.log("holding at",x,y)
	}, 100)

	$(canvas).on('mousedown', withMouse(canvas, this.drawStart.bind(this, MOUSE)))
	$(canvas).on('touchstart', withTouch(canvas, this.drawStart.bind(this, TOUCH)))
	var resizeFrame
	function onResize(){
		if (canvas.width === canvas.clientWidth) return
		cancelAnimationFrame(resizeFrame)
		resizeFrame = requestAnimationFrame(function(){
			canvas.width = canvas.clientWidth
			canvas.height = canvas.clientWidth / 2
			canvas.style.height = canvas.height + "px"
			onresize()
		})
	}
	$(canvas).on('transitionend', onResize)
	$(window).on('resize', onResize)
	onResize()
}
DrawingCanvas.prototype = {
	// make sure to bind the input functions
	// coordinates are normalized [0, 1)
	setDrawFn: function(drawFn) {
		this.onDraw = drawFn
	},
	setHoldFn: function(holdFn, interval) {
		this.onHold = holdFn
		this.holdInterval = interval
	},
	drawStart: function(pointerType, x, y) {
		var canvas = this.canvas,
			width = canvas.clientWidth,
			height = canvas.clientHeight,
			doClamp = this.doClamp,
			onDraw = this.onDraw,
			onHold = this.onHold,
			holdInterval = this.holdInterval,
			holdTimer
		// x and y are closure'd
		function draw (xNext, yNext) {
			if (doClamp) {
				xNext = clamp(xNext, 0, width-1)
				yNext = clamp(yNext, 0, height-1)
			}
			onDraw(x / width, y / height, xNext / width, yNext / height)
			x = xNext
			y = yNext
			if (onHold) {
				clearInterval(holdTimer)
				holdTimer = onHold && setInterval(function(){
					onHold(x / width, y / height)
				}, holdInterval)
			}
		}
		draw(x, y);

		function addMoveAndEndHandlers(moveEventName, endEventName, withPointer) {
			var onMove = onDraw && withPointer(canvas, draw)
			function onEnd() {
				clearInterval(holdTimer)
				$(window).off(moveEventName, onMove, true)
				$(window).off(endEventName, onEnd, false)
			}
			$(window).on(moveEventName, onMove, true)
			$(window).on(endEventName, onEnd, false)
		}
		switch (pointerType) {
			case MOUSE:
				addMoveAndEndHandlers('mousemove', 'mouseup', withMouse)
				break
			case TOUCH:
				addMoveAndEndHandlers('touchmove', 'touchend', withTouch)
				break
		}
	},
}

// canvas for displaying a pair of 1d signals
function Canvas1DPair (canvas, signal1, signal2) {
	this.ctx = canvas.getContext('2d')
	this.updated = true
	this.setSignals(signal1, signal2)
}
Canvas1DPair.prototype = {
	setSignals: function(signal1, signal2) {
		this.signal1 = signal1
		this.signal2 = signal2
		this.doUpdate()
	},
	doUpdate: function() {
		if (!this.updated) return; // don't update until already updated
		this.updated = false
		requestAnimationFrame(this.render.bind(this))
	},
	render: function() {
		if (this.updated) return
		// console.log("rendering")
		this.updated = true
		var ctx = this.ctx
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.lineJoin = "round";
		ctx.lineWidth = 2;
		this.drawLine(this.signal2, 'blue')
		this.drawLine(this.signal1, 'red')
	},
	drawLine: function(signal, color) {
		var ctx = this.ctx,
			width = ctx.canvas.width
			height = ctx.canvas.height
			len = signal.length
		ctx.beginPath()
		ctx.strokeStyle = color;
		for (var i = 0; i < len; i++) {
			var x = width * i / (len - 1)
			var y = height * (signal.get(i)+1)/2
			// draw the line
			if (i === 0) {
				ctx.moveTo(x, y)
			} else {
				ctx.lineTo(x, y)
			}
		}
		ctx.stroke()
		ctx.closePath()
	}
}

// float64array wrappers
function ComplexSignal(array, ifImag, onUpdate) {
	this.array = array
	this.length = array.length / 2
	this.ifImag = ifImag ? 1 : 0
	this.onUpdate = onUpdate
}
ComplexSignal.prototype = {
	get: function(i) {
		return this.array[2*i + this.ifImag]
	},
	set: function(i, x) {
		this.array[2*i + this.ifImag] = x
		this.onUpdate()
	}
}
ComplexSignal.create = function(array, onUpdate) {
	return {
		real: new ComplexSignal(array, false, onUpdate),
		imag: new ComplexSignal(array, true, onUpdate)
	}
}

// holds a signal pair and updates stuff connected to them
function TwoWayFFT(FFT, IFFT) {
	// FFT constructors
	this.FFT = FFT
	this.IFFT = IFFT
	// set these callbacks
	this.onUpdateTime = function() {console.log("time updated")}
	this.onUpdateFreq = function() {console.log("freq updated")}
}
TwoWayFFT.prototype = {
	setLength: function(n) {
		this.time = new Float64Array(n) // modify these
		this.freq = new Float64Array(n)
		this.fft = new this.FFT(n/2, false)
		this.ifft = new this.IFFT(n/2)
		// this.onUpdateTime()
		// this.onUpdateFreq()
	},
	updateTime: function() {
		this.fft.simple(this.freq, this.time)
		for (var i = 0; i < this.freq.length; i++) {
			this.freq[i] /= this.freq.length/2
		}
		// this.onUpdateFreq()
	},
	updateFreq: function() {
		this.ifft.simple(this.time, this.freq)
		// this.onUpdateTime()
	}
}

function ComplexDFTCanvas(timeCanvas, freqCanvas, n) {
	// model
	this.n = n
	this.signals = new TwoWayFFT(FFT.complex, FFT.inverse.complex)

	// view
	this.timeCanvas = new Canvas1DPair(timeCanvas)
	this.freqCanvas = new Canvas1DPair(freqCanvas)
	// this.signals.onUpdateTime = this.timeCanvas.doUpdate.bind(this.timeCanvas)
	// this.signals.onUpdateFreq = this.freqCanvas.doUpdate.bind(this.freqCanvas)

	this.setLength(n)

	// controller
	this.timeDraw = new DrawingCanvas(timeCanvas, this.timeCanvas.doUpdate.bind(this.timeCanvas))
	this.timeDraw.setDrawFn(this.onDraw.bind(this, 'time'))
	this.timeDraw.setHoldFn(null)

	this.freqDraw = new DrawingCanvas(freqCanvas, this.freqCanvas.doUpdate.bind(this.freqCanvas))
	this.freqDraw.setDrawFn(this.onDraw.bind(this, 'freq'))
	this.freqDraw.setHoldFn(null)

	this.select = 'real'
}
ComplexDFTCanvas.prototype = {
	setLength: function(n) {
		this.signals.setLength(n)
		var updateTime = this.signals.updateTime.bind(this.signals)
		var updateFreq = this.signals.updateFreq.bind(this.signals)
		this.time = ComplexSignal.create(this.signals.time, updateTime)
		this.freq = ComplexSignal.create(this.signals.freq, updateFreq, n)

		this.timeCanvas.setSignals(this.time.real, this.time.imag)
		this.freqCanvas.setSignals(this.freq.real, this.freq.imag)
		this.updateView()
	},
	onDraw: function(signalType, x0,y0,x1,y1) {
		 // normalized to array index
		x0 = clamp(Math.floor(x0*this.n/2), 0, this.n/2 -1)
		x1 = clamp(Math.floor(x1*this.n/2), 0, this.n/2 -1)
		y0 = (2*y0)-1
		y1 = (2*y1)-1
		if (x1-x0 === 0) {
			this[signalType][this.select].set(x1, y1 )
		} else {
			var m = (y1 - y0) / (x1 - x0)
			for (var x = 0; x <= Math.abs(x1-x0); x++) {
				var y = y0 + m*x
				this[signalType][this.select].set(x+Math.min(x0,x1), y)
			}
		}
		// console.log("setting", signalType, this.select, x, (2*y)-1 )
		this.updateView()
	},
	updateView: function() {
		this.timeCanvas.doUpdate()
		this.freqCanvas.doUpdate()
	},
	setOptions: function(options) {
		if (options.length) {
			this.setLength(options.length)
		}
		if (options.drawType) {
			this.select = options.drawType
		}
	}
}

window.onload = function main() {
	var complex = new ComplexDFTCanvas($('.complex .time'),$('.complex .freq'), 256)
	// var c = canvas.getContext('2d')

	// window.onresize = function() {
	// 	canvas.width = canvas.clientWidth
	// 	canvas.height = canvas.clientHeight
	// }
}
