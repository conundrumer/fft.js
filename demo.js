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
// a DOM node with event handlers for click/drag mouse and touch interaction
function DrawingNode(node) {
	this.node = node;
	this.setDrawFn(function (xOld,yOld,x,y) {
		console.log(xOld,yOld," to ",x,y)
	})
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
	setDrawFn: function(drawFn) {
		this.doDraw = drawFn
	},
	drawStart: function(pointerType, x, y) {
		var node = this.node,
			doDraw = this.doDraw
		// x and y are closure'd here
		function draw (xNext, yNext) {
			xNext = clamp(xNext, 0, node.clientWidth)
			yNext = clamp(yNext, 0, node.clientHeight)
			doDraw(x, y, xNext, yNext)
			x = xNext
			y = yNext
		}
		draw(x, y);

		function addEventHandlers(moveEventName, endEventName, withPointer) {
			var onMove = withPointer(node, draw)
			function onEnd() {
				$(window).off(moveEventName, onMove, true)
				$(window).off(endEventName, onEnd, false)
			}
			$(window).on(moveEventName, onMove, true)
			$(window).on(endEventName, onEnd, false)
		}
		switch (pointerType) {
			case MOUSE:
				addEventHandlers('mousemove', 'mouseup', withMouse)
				break
			case TOUCH:
				addEventHandlers('touchmove', 'touchend', withTouch)
				break
		}
	},
}

window.onload = function main() {
	var c = new DrawingNode($('.complex .time'))
}
