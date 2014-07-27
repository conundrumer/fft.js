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
	this.doClamp = !noClamp
	this.holdX = false
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
			holdTimer,
			holdX = this.holdX
		// x and y are closure'd
		function draw (xNext, yNext) {
			if (holdX) {
				xNext = x
			}
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
function Canvas1DPair (canvas, scale) {
	this.ctx = canvas.getContext('2d')
	this.updated = true
	this.signal1 = null
	this.signal2 = null
	this.scale = scale || 1
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
		ctx.lineWidth = 1.5;
		if (this.signal1.length > 64) {
			this.drawLine(this.signal2, 'blue')
			this.drawLine(this.signal1, 'red')
		} else {
			ctx.strokeStyle = 'black'
			ctx.beginPath()
			ctx.moveTo(0, ctx.canvas.height/2)
			ctx.lineTo(ctx.canvas.width, ctx.canvas.height/2)
			ctx.stroke()
			this.drawStem(this.signal2, 'blue')
			this.drawStem(this.signal1, 'red')
		}
	},
	plotPoint: function(signal, plotfn) {
		for (var i = 0; i < signal.length; i++) {
			var x = this.ctx.canvas.width * i / (signal.length - 1)
			var y = this.ctx.canvas.height * (signal.get(i)*this.scale+1)/2
			plotfn(x, y)
		}
	},
	drawStem: function(signal, color) {
		if (!signal) return;
		var ctx = this.ctx
			radius = Math.min(20, ctx.canvas.width / signal.length / 2 - 1)
		ctx.strokeStyle = color;
		this.plotPoint(signal, function(x,y){
			ctx.beginPath()
			ctx.moveTo(x, ctx.canvas.height/2)
			ctx.lineTo(x, y)
			ctx.stroke()
			ctx.beginPath()
			ctx.arc(x, y, radius, 0, 2*Math.PI)
			ctx.stroke()
		}.bind(this))
	},
	drawLine: function(signal, color) {
		if (!signal) return;
		var ctx = this.ctx
		ctx.beginPath()
		ctx.strokeStyle = color;
		this.plotPoint(signal, function(x,y){
			ctx.lineTo(x, y)
		}.bind(this))
		ctx.stroke()
	}
}

// float64array wrappers
function ComplexSignal(array, onUpdate, ifImag) {
	this.array = array
	this.length = array.length/2
	this.onUpdate = onUpdate
	this.ifImag = ifImag ? 1 : 0
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
		real: new ComplexSignal(array, onUpdate, false),
		imag: new ComplexSignal(array, onUpdate, true)
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
		this.time = new Float64Array(2*n) // modify these
		this.freq = new Float64Array(2*n)
		this.fft = new this.FFT(n, false)
		this.ifft = new this.IFFT(n)
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

function ComplexDFTCanvas(nodes) {
	this.n = null
	this.select = 'real'
	// model
	this.signals = new TwoWayFFT(FFT.complex, FFT.inverse.complex)

	// view
	this.canvas = {
		time: new Canvas1DPair(nodes.time),
		freq: new Canvas1DPair(nodes.freq, 2)
	}

	// controller
	function newDrawingCanvas(canvas, type) {
		var draw = new DrawingCanvas(canvas, this.canvas[type].doUpdate.bind(this.canvas[type]))
		draw.setDrawFn(this.onDraw.bind(this, type))
		draw.setHoldFn(null)
		return draw
	}
	this.draw = {
		time: newDrawingCanvas.call(this, nodes.time, 'time'),
		freq: newDrawingCanvas.call(this, nodes.freq, 'freq')
	}

	$(nodes.slider).on('change', function(e){
		this.setLength(e.target.valueAsNumber)
	}.bind(this))
	nodes.radios.forEach(function(radio){
		$(radio).on('change', function(e) {
			this.select = e.target.value
		}.bind(this))
	}.bind(this))
	$(nodes.clear).on('click', function(){
		this.setLength(this.n)
	}.bind(this))
	$(nodes.holdSample).on('click', function(e){
		this.draw.time.holdX = e.target.checked
		this.draw.freq.holdX = e.target.checked
	}.bind(this))
}
ComplexDFTCanvas.prototype = {
	round: function(x) {
		return Math.round(x*(this.n-1))
	},
	scale: function(x, signalType) {
		switch (signalType) {
			case 'time':
				return 2*x - 1
			case 'freq':
				return (2*x-1)/2
		}
	},
	getTimeSignal: function(onUpdate) {
		return ComplexSignal.create(this.signals.time, onUpdate)
	},
	getFreqSignal: function(onUpdate) {
		return ComplexSignal.create(this.signals.freq, onUpdate)
	},
	setLength: function(n) {
		this.n = n;
		this.signals.setLength(n)
		this.time = this.getTimeSignal(this.signals.updateTime.bind(this.signals))
		this.freq = this.getFreqSignal(this.signals.updateFreq.bind(this.signals))

		this.canvas.time.setSignals(this.time.real, this.time.imag)
		this.canvas.freq.setSignals(this.freq.real, this.freq.imag)
		// this.updateView()
	},
	onDraw: function(signalType, x0,y0,x1,y1) {
		 // normalized to array index
		x0 = this.round(x0, signalType)
		x1 = this.round(x1, signalType)
		y0 = this.scale(y0, signalType)
		y1 = this.scale(y1, signalType)
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
		this.canvas.time.doUpdate()
		this.canvas.freq.doUpdate()
	}
}
function RealDFTCanvas(nodes) {
	ComplexDFTCanvas.apply(this, nodes)
	this.signals = new TwoWayFFT(FFT.real, FFT.inverse.real)
}

function initSlider(slider, rangeDisplay) {
	slider.step = 4
	slider.min = 4
	slider.max = 256
	slider.value = 128
	function onSlide(e){
		var value = e ? e.target.value : slider.value
		rangeDisplay.textContent = "n: " + value
	}
	onSlide()
	$(slider).on('input', onSlide)
}

window.onload = function main() {
	initSlider($('.complex form .sliderN'), $('.complex form .rangeDisplay'))
	var complex = new ComplexDFTCanvas({
		time: $('.complex .time'),
		freq: $('.complex .freq'),
		radios: [
			$('.complex form [value="real"]'),
			$('.complex form [value="imag"]')
		],
		clear: $('.complex form .buttonClear'),
		holdSample: $('.complex form .checkHold'),
		slider: $('.complex form .sliderN')
	})
	complex.setLength(128)

}
