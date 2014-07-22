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
// a DOM node with event handlers for click/hold/drag mouse and touch interaction
function DrawingNode(node, doClamp) {
	this.node = node;
	this.doClamp = doClamp
	this.setDrawFn(function (xOld,yOld,x,y) {
		console.log(xOld,yOld," to ",x,y)
	})
	this.setHoldFn(function(x,y){
		console.log("holding at",x,y)
	}, 100)
	$(node).on('mousedown', withMouse(node, this.drawStart.bind(this, MOUSE)))
	$(node).on('touchstart', withTouch(node, this.drawStart.bind(this, TOUCH)))
}
DrawingNode.prototype = {
	get width() {
		return this.node.clientWidth
	},
	get height() {
		return this.node.clientHeight
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
		var node = this.node,
			doClamp = this.doClamp,
			onDraw = this.onDraw,
			onHold = this.onHold
		// x and y are closure'd
		function draw (xNext, yNext) {
			if (doClamp) {
				xNext = clamp(xNext, 0, node.clientWidth)
				yNext = clamp(yNext, 0, node.clientHeight)
			}
			onDraw(x, y, xNext, yNext)
			x = xNext
			y = yNext
		}
		draw(x, y);

		var holdTimer = setInterval(function(){ onHold(x, y) }, this.holdInterval)

		function addMoveAndEndHandlers(moveEventName, endEventName, withPointer) {
			var onMove = withPointer(node, draw)
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
	var c = new DrawingNode($('.complex .time'), true)
}
