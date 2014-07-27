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
function extend(obj, objExtension) {
	for (var p in objExtension) {
		if (objExtension.hasOwnProperty(p)) {
			obj[p] = objExtension[p];
		}
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
				xNext = clamp(xNext, 0, width)
				yNext = clamp(yNext, 0, height)
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
function Canvas1DPair (canvas, scale, magphz) {
	this.ctx = canvas.getContext('2d')
	this.updated = true
	this.signals = []
	this.magphz = magphz
}
Canvas1DPair.prototype = {
	setSignals: function(signal0, signal1) {
		this.signals[0] = signal0
		this.signals[1] = signal1
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
		var ctx = this.ctx,
			lineWidth = ctx.canvas.width > 480 ? 2 : 1.5
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
		ctx.lineJoin = "round"
		ctx.lineWidth = lineWidth
		if (this.signals[0].length > 64) {
			this.drawLine(this.signals[1], 'blue')
			ctx.lineWidth = this.magphz ? 1.5*lineWidth : lineWidth
			this.drawLine(this.signals[0], 'red')
		} else {
			ctx.strokeStyle = this.magphz ? 'blue' : 'black'
			ctx.beginPath()
			ctx.moveTo(0, ctx.canvas.height/2)
			ctx.lineTo(ctx.canvas.width, ctx.canvas.height/2)
			ctx.stroke()
			this.drawStem(this.signals[1], 'blue')
			if (!this.magphz){
				this.drawStem(this.signals[0], 'red')
			} else {
				this.drawStemPlot(this.signals[0], 'red')
			}
		}
	},
	plotPoint: function(signal, plotfn) {
		for (var i = 0; i < signal.length; i++) {
			var x = (this.ctx.canvas.width-1) * i / (signal.length - 1) + 0.5
			var y = this.ctx.canvas.height * (signal.get(i)+1)/2
			plotfn(x, y)
		}
	},
	drawStem: function(signal, color, circlesOnly) {
		if (!signal) return;
		var ctx = this.ctx
			radius = Math.min(15, ctx.canvas.width / signal.length / 2 - 1)
		ctx.strokeStyle = color;
		this.plotPoint(signal, function(x,y){
			if (!circlesOnly) {
				ctx.beginPath()
				ctx.moveTo(x, ctx.canvas.height*0.5)
				ctx.lineTo(x, y)
				ctx.stroke()
			}
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
	},
	drawStemPlot: function(signal, color) {
		this.drawStem(signal, color, true)
		this.ctx.lineWidth *= 1.5
		this.drawLine(signal, color)
	}
}

// float64array wrappers
function ComplexSignal(array, onUpdate, scale, ifImag) {
	this.array = array
	this.length = array.length/2
	this.onUpdate = onUpdate
	this.ifImag = ifImag ? 1 : 0
	this.scale = scale || 1
}
ComplexSignal.prototype = {
	get: function(i) {
		return -this.array[2*i + this.ifImag] * this.scale
	},
	set: function(i, x) {
		this.array[2*i + this.ifImag] = x / this.scale
		this.onUpdate()
	}
}
ComplexSignal.create = function(array, onUpdate, scale) {
	return {
		real: new ComplexSignal(array, onUpdate, scale, false),
		imag: new ComplexSignal(array, onUpdate, scale, true)
	}
}
var UPPER_BOUND = 0 // db
var LOWER_BOUND = -30 //db
function ComplexMag(array, onUpdate) {
	ComplexSignal.call(this, array, onUpdate)
}
ComplexMag.prototype = {
	getDenormalized: function (i) {
		var re = this.array[2*i],
			im = this.array[2*i + 1]
		// console.log("getdenorm",i, re, im)
		return 10*Math.log(re*re+im*im)/Math.LN10
	},
	get: function(i) {
		var denorm = this.getDenormalized(i);
		console.log("denorm", denorm)
		if (denorm === Number.NEGATIVE_INFINITY) return 1
		var m = (denorm - LOWER_BOUND) / (UPPER_BOUND - LOWER_BOUND)
		console.log("m", m)
		return Math.min(-m, 1)
	},
	set: function(i, x) { // in proportion to prev magnitude, don't change phase
		console.log("x before", x)
		x = (1-x) * (UPPER_BOUND - LOWER_BOUND) + LOWER_BOUND
		console.log("x after", x)
		var r = Math.pow(10, (x - this.getDenormalized(i))/20)
		console.log("r", r)
		this.array[2*i] *= r
		this.array[2*i+1] *= r
		this.onUpdate()
	}
}
function ComplexPhz(array, onUpdate) {
	ComplexSignal.call(this, array, onUpdate)
}
ComplexPhz.prototype = {
	get: function(i) {
		var re = this.array[2*i],
			im = this.array[2*i + 1]
		// console.log("phz get", i, re, im, Math.atan2(im, re) / Math.PI)
		return -Math.atan2(im, re) / Math.PI
	},
	set: function(i, x) { // in proportion to prev magnitude,don't change magnitude
		x = -(2*x-1) * Math.PI
		var re = this.array[2*i],
			im = this.array[2*i + 1],
			mag = Math.sqrt(re*re+im*im)
		this.array[2*i] = mag*Math.cos(x)
		this.array[2*i+1] = mag*Math.sin(x)
		console.log("set mag, i:", i, ", x: ", x)
		console.log("re: ", re, "im:", i)
		console.log("mag: ", mag)
		console.log("reOut: ", this.array[2*i], "imOut:", this.array[2*i+1])
		this.onUpdate()
	}
}
ComplexSignal.createMagPhz = function(array, onUpdate) {
	return {
		mag: new ComplexMag(array, onUpdate),
		phz: new ComplexPhz(array, onUpdate),
	}
}
function ComplexMagPhz (array, onUpdate) {
	this.array = array
	this.length = array.length/2
	this.onUpdate = onUpdate
	this.magphz = new Float64Array(array.length)
	this.mag = {
		length: this.length,
		get: function(i) {
			var mag = this.magphz[2*i];
			// console.log("mag", mag)
			if (mag === Number.NEGATIVE_INFINITY) return 1
			var mNormalized = (mag - LOWER_BOUND) / (UPPER_BOUND - LOWER_BOUND)
			// console.log("mNormalized", mNormalized)
			return Math.min(1-2*mNormalized, 1)
		}.bind(this),
		set: function(i, x) {
			// console.log("x before", x)
			x = (1-x) * (UPPER_BOUND - LOWER_BOUND) + LOWER_BOUND
			// console.log("x after", x)
			var mag = Math.pow(10, x/20),
				phz = this.magphz[2*i+1]
			// console.log("mag", mag)
			// console.log("phz", phz)
			this.array[2*i] = mag * Math.cos(phz)
			this.array[2*i+1] = mag * Math.sin(phz)
			// console.log("re", this.array[2*i])
			// console.log("im", this.array[2*i+1])
			this.magphz[2*i] = x
			this.onUpdate()
		}.bind(this)
	}
	this.phz = {
		length: this.length,
		get: function(i) {
			return -this.magphz[2*i+1] / Math.PI
		}.bind(this),
		set: function(i, x) {
			x = -2*(x-0.5) * Math.PI
			var re = this.array[2*i],
				im = this.array[2*i + 1],
				mag = Math.pow(10, this.magphz[2*i]/20)
			this.array[2*i] = mag*Math.cos(x)
			this.array[2*i+1] = mag*Math.sin(x)
			this.magphz[2*i+1] = x
			this.onUpdate()
		}.bind(this)
	}
	this.update()
}
// update magphz from array
ComplexMagPhz.prototype.update = function() {
	for (var i = 0; i < this.length; i++) {
		var re = this.array[2*i],
			im = this.array[2*i+1]
		this.magphz[2*i] = 10*Math.log(re*re+im*im)/Math.LN10
		this.magphz[2*i+1] = Math.atan2(im, re)
	}
}
function RealSignal (array, onUpdate) {
	this.array = array
	this.length = array.length
	this.onUpdate = onUpdate
}
RealSignal.prototype = {
	get: function(i) {
		return -this.array[i]
	},
	set: function(i, x) {
		this.array[i] = x
		this.onUpdate()
	}
}
RealSignal.create = function(array, onUpdate) {
	return {
		real: new RealSignal(array, onUpdate)
	}
}

// holds a signal pair and updates stuff connected to them
function TwoWayFFT(FFT, IFFT, isReal) {
	// FFT constructors
	this.FFT = FFT
	this.IFFT = IFFT
	// set these callbacks
	this.onUpdateTime = function() {console.log("time updated")}
	this.onUpdateFreq = function() {console.log("freq updated")}
	this.isReal = isReal
}
TwoWayFFT.prototype = {
	setLength: function(n) {
		if (this.isReal) {
			this.time = new Float64Array(n) // modify these
			this.freq = new Float64Array(n+2)
		} else {
			this.time = new Float64Array(2*n)
			this.freq = new Float64Array(2*n)
		}
		this.fft = new this.FFT(n, false)
		this.ifft = new this.IFFT(n)
		// this.onUpdateTime()
		// this.onUpdateFreq()
	},
	updateTime: function() {
		this.fft.simple(this.freq, this.time)
		for (var i = 0; i < this.freq.length; i++) {
			this.freq[i] /= (this.isReal ? this.time.length : this.time.length/2)
		}
		// this.onUpdateFreq()
	},
	updateFreq: function() {
		console.log("Update freq")
		console.log("timebefore", this.time)
		console.log("freqbefore", this.freq)
		this.ifft.simple(this.time, this.freq)
		console.log("timeafter", this.time)
		console.log("freqafter", this.freq)
		// this.onUpdateTime()
	}
}

function ComplexDFTCanvas(nodes, signals) {
	this.n = null
	this.select = 'real'
	// model
	this.signals = signals || new TwoWayFFT(FFT.complex, FFT.inverse.complex)

	// view
	this.canvas = this.makeCanvas(nodes.time, nodes.freq)

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
	makeCanvas: function(time, freq) {
		return {
			time: new Canvas1DPair(time),
			freq: new Canvas1DPair(freq, 2)
		}
	},
	round: function(x) {
		return Math.round(x*(this.n-1))
	},
	scale: function(y) {
		return -2*y + 1
	},
	makeTimeSignal: function(onUpdate) {
		this.time =ComplexSignal.create(this.signals.time, onUpdate)
		this.canvas.time.setSignals(this.time.real, this.time.imag)
	},
	makeFreqSignal: function(onUpdate) {
		this.freq =ComplexSignal.create(this.signals.freq, onUpdate, 2)
		this.canvas.freq.setSignals(this.freq.real, this.freq.imag)
	},
	setLength: function(n) {
		this.n = n;
		this.signals.setLength(n)
		this.makeTimeSignal(this.signals.updateTime.bind(this.signals))
		this.makeFreqSignal(this.signals.updateFreq.bind(this.signals))

		// this.updateView()
	},
	onDraw: function(signalType, x0,y0,x1,y1) {
		 // normalized to array index
		x0 = this.round(x0, signalType)
		x1 = this.round(x1, signalType)
		y0 = this.scale(y0, signalType)
		y1 = this.scale(y1, signalType)
		// console.log(y1)
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
	ComplexDFTCanvas.call(this, nodes, new TwoWayFFT(FFT.real, FFT.inverse.real, true))
	this.select = 'mag'
}
extend(RealDFTCanvas.prototype, ComplexDFTCanvas.prototype)
extend(RealDFTCanvas.prototype, {
	makeCanvas: function(time, freq) {
		return {
			time: new Canvas1DPair(time),
			freq: new Canvas1DPair(freq, 1, true)
		}
	},
	round: function(x, signalType) {
		switch (signalType) {
			case 'time':
				return Math.round(x * (this.n - 1))
			case 'freq':
				return Math.round(x * (this.n/2))
		}
	},
	scale: function(y, signalType) {
		switch (signalType) {
			case 'time':
				return -2*y + 1
			case 'freq':
				return y
		}
	},
	makeTimeSignal: function(onUpdate) {
		this.time = RealSignal.create(this.signals.time, function(){
			onUpdate() // update freq real/imag array
			this.freq.update() // update freq mag/phz array
		}.bind(this))
		this.canvas.time.setSignals(this.time.real)
		this.time.mag = this.time.real
		this.time.phz = this.time.real
	},
	makeFreqSignal: function(onUpdate) {
		this.freq = new ComplexMagPhz(this.signals.freq, onUpdate)
		this.canvas.freq.setSignals(this.freq.mag, this.freq.phz)
	}
})

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
	initSlider($('.section.complex form .sliderN'), $('.section.complex form .rangeDisplay'))
	var complex = new ComplexDFTCanvas({
		time: $('.section.complex .time'),
		freq: $('.section.complex .freq'),
		radios: [
			$('.section.complex form [value="real"]'),
			$('.section.complex form [value="imag"]')
		],
		clear: $('.section.complex form .buttonClear'),
		holdSample: $('.section.complex form .checkHold'),
		slider: $('.section.complex form .sliderN')
	})
	complex.setLength(128)

	initSlider($('.section.real form .sliderN'), $('.section.real form .rangeDisplay'))
	var real = new RealDFTCanvas({
		time: $('.section.real .time'),
		freq: $('.section.real .freq'),
		radios: [
			$('.section.real form [value="mag"]'),
			$('.section.real form [value="phz"]')
		],
		clear: $('.section.real form .buttonClear'),
		holdSample: $('.section.real form .checkHold'),
		slider: $('.section.real form .sliderN')
	})
	real.setLength(128)
}
