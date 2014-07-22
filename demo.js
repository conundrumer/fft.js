window.onload = main

function main() {
	console.log("ready")
	var c = new DrawingCanvas(document.querySelector('.complex .time'))
}

var MOUSE = 0
var TOUCH = 1

function withMouse(node, fn) {
	return function (event) {
		event.preventDefault()
		fn(event.offsetX, event.offsetY)
	}
}
function withTouch(node, fn) {
	return function (event) {
		event.preventDefault()
		var touch = event.targetTouches[0]
		fn(touch.pageX - node.offsetLeft, touch.pageY - node.offsetTop)
	}
}

function DrawingCanvas(canvas) {
	this.canvas = canvas;
	this.ctx = canvas.getContext('2d')
	canvas.addEventListener('mousedown', withMouse(canvas, this.drawStart.bind(this, MOUSE)))
	canvas.addEventListener('touchstart', withTouch(canvas, this.drawStart.bind(this, TOUCH)))
}
DrawingCanvas.prototype = {
	drawStart: function(pointerType, x, y) {
		var canvas = this.canvas,
			doDraw = /*this.doDraw.bind(this)*/ function (xOld,yOld,x,y) {
				console.log(xOld,yOld," to ",x,y)
			}
		function draw (xNext, yNext) {
			doDraw(x, y, xNext, yNext)
			x = xNext
			y = yNext
		}
		event.preventDefault()
		switch (pointerType) {
			case MOUSE:
				var mouseDraw = withMouse(canvas, draw)
				function removeMouse() {
					canvas.removeEventListener('mousemove', mouseDraw, true)
					canvas.removeEventListener('mouseup', removeMouse, false)
					canvas.removeEventListener('mouseleave', removeMouse, false)
				}
				canvas.addEventListener('mousemove', mouseDraw, true)
				canvas.addEventListener('mouseup', removeMouse, false)
				canvas.addEventListener('mouseleave', removeMouse, false)
				break
			case TOUCH:
				var touchDraw = withTouch(canvas, draw)
				canvas.addEventListener('touchmove', touchDraw, true)
				canvas.addEventListener('touchend', function removeTouch() {
					canvas.removeEventListener('touchmove', touchDraw, true)
					canvas.removeEventListener('touchend', removeTouch, false)
				}, false)
				break
		}
		draw(x, y);
	},
}
