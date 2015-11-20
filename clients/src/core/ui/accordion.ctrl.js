(function() {
	'use strict';

	angular
	.module('gl.ui')

	.controller('AccordionController', AccordionController);

	function AccordionController($scope, $animateCss) {
		$scope.collapseAccordion = function(accordion) {
			var contentElem = accordion.content;
			var height = contentElem[0].scrollHeight;
			accordion.expanded = false;
			contentElem.css('maxHeight', height+'px');
			var animator = $animateCss(contentElem, {
				from: {
					maxHeight: height+'px',
					opacity: 1
				},
				to: {
					maxHeight: '0px',
					opacity: 0
				},
				easing: 'ease-out',
				duration: 0.4
			});
			animator.start()
		}
		$scope.expandAccordion = function(accordion) {
			var contentElem = accordion.content;
			accordion.expanded = true;
			var height = contentElem[0].scrollHeight;
			var animator = $animateCss(contentElem, {
				from: {
					maxHeight: '0px',
					opacity: 0
				},
				to: {
					maxHeight: height + 'px',
					opacity: 1
				},
				easing: 'ease-out',
				duration: 0.4
			});
			animator.start().done(function() {
				contentElem.css('maxHeight', 'none');
			});
		}
		$scope.toggleAccordion = function(accordion) {
			if (!accordion.independent) {
				if ($scope.selectedAccordion && $scope.selectedAccordion !== accordion && $scope.selectedAccordion.expanded) {
					$scope.collapseAccordion($scope.selectedAccordion);
				}
				$scope.selectedAccordion = accordion;	
			}
			if (accordion.expanded) {
				$scope.collapseAccordion(accordion);
			} else {
				$scope.expandAccordion(accordion);
			}
		};
	}
})();
