(function() {
	'use strict';

	angular
	.module('gl.ui')
	.directive('glTreeView', glTreeView)
	.directive('glTreeNode', glTreeNode)
	.directive('glCheckTreeView', glCheckTreeView)
	.directive('glCheckTreeNode', glCheckTreeNode);

	function glTreeView() {
		return {
			restrict: 'A',
			scope: {
				rootNodes: '=glTreeView',
				idAttribute: '@glTreeIdAttribute',
				labelAttribute: '@glTreeLabelAttribute',
				childrenAttribute: '@glTreeChildrenAttribute',
				selectedValue: '@glTreeSelectedValue',
				groupTemplateId: '@glTreeGroupTpl',
				leafTemplateId: '@glTreeLeafTpl',
				changeHandler: '&glTreeViewChangeHandler'
			},
			transclude: true,
			link: function(scope, iElem, iAttrs, ctrl, transclude) {
				transclude(scope, function(clone) {
					iElem.append(clone);
				});
			},
			controller: ['$scope', function($scope) {
				$scope.$node = {
					data: null,
					parent: null,
					treeDepth: 0,
					isGroup: true,
					children: [],
					
				};
				$scope.$node.tree = {
					root: $scope.$node,
					selectedValue: $scope.selectedValue? $scope.$parent.$eval($scope.selectedValue) : ''
				};
				$scope.nodeSelected = function(value) {
					$scope.changeHandler({value: value});
				}
			}]
		}
	}

	function glTreeNode() {
		return {
			restrict: 'A',
			scope: true,
			transclude: true,
			controller: ['$scope', '$compile', '$element','$templateCache', function($scope, $compile, $element, $templateCache) {
				$scope.buildHtml = function() {
					var templateId = $scope.$node.isGroup? $scope.groupTemplateId : $scope.leafTemplateId;
					var template = $templateCache.get(templateId);
					var tElem = angular.element(template);
					$element.append(tElem);
					$compile(tElem)($scope);
				};
			}],
			compile: function(tElem, tAttrs) {
				return {
					pre: function(scope, iElem, iAttrs) {
						var nodeModel = scope.$eval(iAttrs.glTreeNode);
						scope.$node = {
							data: nodeModel,
							treeDepth: scope.$node? scope.$node.treeDepth+1 : 1,
							isGroup: nodeModel.hasOwnProperty(scope.childrenAttribute),
							parent: scope.$parent.$node,
							tree: scope.$parent.$node.tree,
							children: []
						};
					},
					post: function(scope, iElem, iAttrs) {
						scope.buildHtml();
						var parent = scope.$node.parent;
						parent.children.push(scope.$node);
					}
				};
			}
		}
	}

	function CheckTreeView(idAttribute, childrenAttribute, selectAttribute) {
		this.idAttribute = idAttribute;
		this.childrenAttribute = childrenAttribute;
		this.selectAttribute = selectAttribute;
	};

	CheckTreeView.prototype.setGroupVisibility = function($node) {
		$node.isEnabled = $node.parent.isEnabled && $node.isChecked;//$node.data[this.selectAttribute];
		$node.children.forEach(function(child) {
			if (child.isGroup) {
				this.setGroupVisibility(child);
			} else {
				child.data[this.selectAttribute] = child.parent.isEnabled && child.isChecked;
			}
		}, this);
	};

	CheckTreeView.prototype.syncWithModel = function($node) {
		var fn = function(node) {
			if (node.isGroup) {
				node.children.forEach(fn);
			} else {
				var selected = node.data[this.selectAttribute];
				if (selected && !node.parent.isEnabled) {
					var parent = node.parent;
					while (parent && !parent.isEnabled) {
						parent.data[this.selectAttribute] = true;
						parent.isChecked = true;
						parent.isEnabled = true;
						parent = node.parent;
					}
				}
				if (node.isChecked != selected) {
					node.isChecked = selected;
				}
			}
		}.bind(this);
		fn($node);
	};

	function glCheckTreeView($timeout, $parse) {
		return {
			restrict: 'A',
			scope: {
				rootNodes: '=glCheckTreeView',
				idAttribute: '@glTreeIdAttribute',
				selectAttribute: '@glTreeSelectedAttribute',
				childrenAttribute: '@glTreeChildrenAttribute',
				groupTemplateId: '@glTreeGroupTpl',
				leafTemplateId: '@glTreeLeafTpl',
				changeHandler: '&glTreeViewChangeHandler'
			},
			transclude: true,
			link: function(scope, iElem, iAttrs, ctrl, transclude) {
				transclude(scope, function(clone) {
					iElem.append(clone);
				});
				if (iAttrs.glVar) {
					$parse(iAttrs.glVar).assign(scope.$parent, scope.treeView);
				}
			},
			controller: ['$scope', function($scope) {
				$scope.$node = {
					data: null,
					parent: null,
					treeDepth: 0,
					isGroup: true,
					isExpanded: true,
					isEnabled: true,
					children: []
				};
				$scope.$on('layersChanged', function() {
					$scope.treeView.syncWithModel($scope.$node);
				});
				$scope.nodeSelected = function($node) {
					if ($node.isGroup) {
						$scope.treeView.setGroupVisibility($node);
					} else {
						$node.data[$scope.selectAttribute] = $node.isChecked;
					}
					$scope.changeHandler({node: $node});
				};
				$scope.treeView = new CheckTreeView($scope.idAttribute, $scope.childrenAttribute, $scope.selectAttribute);
			}]
		}
	}

	function glCheckTreeNode() {
		return {
			restrict: 'A',
			scope: true,
			controller: ['$scope', '$compile', '$element', '$templateCache', function($scope, $compile, $element, $templateCache) {
				$scope.buildHtml = function() {
					var templateId = $scope.$node.isGroup? $scope.groupTemplateId : $scope.leafTemplateId;
					var template = $templateCache.get(templateId);
					//$element.append($compile(angular.element(template))($scope));
					var tElem = angular.element(template);
					$element.append(tElem);
					$compile(tElem)($scope);

				};
			}],
			compile: function(tElem, tAttrs) {
				return {
					pre: function(scope, iElem, iAttrs) {
						var nodeModel = scope.$eval(iAttrs.glCheckTreeNode);
						var isGroup = nodeModel.hasOwnProperty(scope.childrenAttribute);
						if (!isGroup && !angular.isDefined(nodeModel[scope.selectAttribute])) {
							nodeModel[scope.selectAttribute] = false;
						}
						scope.$node = {
							data: nodeModel,
							isGroup: isGroup,
							treeDepth: scope.$node? scope.$node.treeDepth+1 : 1,
							isExpanded: true,
							isChecked: nodeModel[scope.selectAttribute],
							parent: scope.$parent.$node,
							children: []
						};
						if (isGroup) {
							scope.$node.isEnabled = nodeModel[scope.selectAttribute];
						}
					},
					post: function(scope, iElem, iAttrs) {
						scope.buildHtml();
						var parent = scope.$node.parent;
						parent.children.push(scope.$node);
					}
				};
			}
		};
	}
})();
