(function() {
	'use strict';

	angular
	.module('gl.ui')
	.directive('glAccordion', glAccordion)
	.directive('glIndependentAccordion', glIndependentAccordion)
	.directive('glAccordionContent', glAccordionContent);

	function glAccordion() {
		return {
			scope: true,
			controller: ['$scope', '$element', function($scope, $element) {
				$scope.$accordion = {elem: $element, expanded: false};
			}]
		}
	}

	function glIndependentAccordion() {
		return {
			scope: true,
			controller: ['$scope', '$element', function($scope, $element) {
				$scope.$accordion = {
					elem: $element,
					expanded: false,
					independent: true
				};
			}],
			compile: function(tElem, tAttrs) {
				return {
					pre: function(scope, iElem, iAttrs) {
						var params = scope.$eval(iAttrs.glIndependentAccordion);
						//angular.merge(scope.$accordion, params);
						angular.extend(scope.$accordion, params);
					}
				};
			}
		}
	}

	function glAccordionContent() {
		return {
			restrict: 'A',
			controller: ['$scope', '$element', function($scope, $element) {
				if ($scope.$accordion) {
					$scope.$accordion.content = $element;
				}
			}],
			compile: function(tElem, tAttrs) {
				return {
					pre: function(scope, iElem, iAttrs) {
						iElem.css('overflow', 'hidden');
						iElem.css('minHeight', '0');
						if (!scope.$accordion.expanded) {
							iElem.css('maxHeight', 0);
						}
					}
				};
			}
		};
	};

})();
