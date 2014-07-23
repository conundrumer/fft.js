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
		fn(event.clientX - node.offsetLeft, event.clientY - node.offsetTop)
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
function DrawingCanvas(canvas, noClamp) {
	this.canvas = canvas;
	this.doClamp = !noClamp
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
		cancelAnimationFrame(resizeFrame)
		resizeFrame = requestAnimationFrame(function(){
			canvas.width = canvas.clientWidth
			canvas.height = canvas.clientWidth / 2
			canvas.style.height = canvas.height + "px"
		})
	}
	$(canvas).on('transitionend', onResize)
	$(window).on('resize', onResize)
	onResize()
}
DrawingCanvas.prototype = {
	get width() {
		return this.canvas.clientWidth
	},
	get height() {
		return this.canvas.clientHeight
	},
	// make sure to bind the input functions
	setDrawFn: function(drawFn) {
		this.onDraw = drawFn
	},
	setHoldFn: function(holdFn, interval) {
		this.onHold = holdFn
		this.holdInterval = interval
	},
	drawStart: function(pointerType, x, y) {
		var canvas = this.canvas,
			doClamp = this.doClamp,
			onDraw = this.onDraw,
			onHold = this.onHold,
			holdInterval = this.holdInterval,
			holdTimer
		// x and y are closure'd
		function draw (xNext, yNext) {
			if (doClamp) {
				xNext = clamp(xNext, 0, canvas.clientWidth-1)
				yNext = clamp(yNext, 0, canvas.clientHeight-1)
			}
			onDraw(x, y, xNext, yNext)
			x = xNext
			y = yNext
			if (onHold) {
				clearInterval(holdTimer)
				holdTimer = onHold && setInterval(function(){ onHold(x, y) }, holdInterval)
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

window.onload = function main() {
	var canvas = new DrawingCanvas($('.complex .time'))
	var canvas2 = new DrawingCanvas($('.complex .freq'))
	// var c = canvas.getContext('2d')

	// window.onresize = function() {
	// 	canvas.width = canvas.clientWidth
	// 	canvas.height = canvas.clientHeight
	// }
}
