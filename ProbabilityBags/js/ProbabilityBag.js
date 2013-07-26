var P;
(function (P) {
    var Numerical = (function () {
        function Numerical(data) {
            this.clusters = this.rebuildClusters(this.data = data);
        }
        Numerical.prototype.rebuildClusters = function (data) {
            var clusters = {};
            for (var i = 0; i < data.length; i++) {
                if (clusters[data[i]]) {
                    clusters[data[i]]++;
                } else {
                    clusters[data[i]] = 1;
                }
            }
            return clusters;
        };

        Numerical.prototype.given = function (to) {
            if (!this.clusters[to]) {
                return 0;
            } else {
                return (this.clusters[this.data[to]] / this.data.length);
            }
        };
        return Numerical;
    })();
    P.Numerical = Numerical;

    var IngoneMe = (function () {
        function IngoneMe() {
            this.keys = {};
        }
        IngoneMe.prototype.getAll = function () {
            return this.keys;
        };

        IngoneMe.prototype.add = function (key, parent) {
            if (typeof parent !== "undefined") {
                for (var pKey in parent) {
                    this.add(pKey);
                }
            }
            if (!this.contains(key)) {
                this.keys[key] = null;
            }
            return this;
        };

        IngoneMe.prototype.contains = function (key) {
            return (key in this.keys);
        };
        return IngoneMe;
    })();
    P.IngoneMe = IngoneMe;

    var Data = (function () {
        function Data(data) {
            this.meta = {
                MembersProportionName: "$$$$Prop",
                MembersToIgnoreName: "$$$$Ingnore",
                RealValueName: "$$$$RealValue"
            };
            if (typeof data !== "undefined") {
                this.addMany(data);
            }
        }
        Data.prototype.addMany = function (items) {
            this.clusters = this.rebuildClusters(new DynamicallyIndexedData(items));
        };

        Data.prototype.getClusters = function () {
            return this.clusters;
        };

        Data.prototype.rebuildClusters = function (did, clusterData) {
            var cluster = clusterData;
            if (typeof clusterData === "undefined") {
                (cluster = {})[this.meta.MembersToIgnoreName] = new IngoneMe();
            }
            var data = did.getRawDataSet();
            var ignoreKeys = cluster[this.meta.MembersToIgnoreName].getAll();

            for (var itemIndex = 0; itemIndex < data.length; itemIndex++) {
                for (var member in data[itemIndex]) {
                    if (!cluster[this.meta.MembersToIgnoreName].contains(member)) {
                        var memberValue = data[itemIndex][member];
                        if (typeof memberValue === "object") {
                            continue;
                        }

                        if (typeof cluster[member] === "undefined") {
                            (cluster[member] = {})[this.meta.MembersProportionName] = 0;
                        }
                        cluster[member][this.meta.MembersProportionName]++;

                        if (typeof cluster[member][memberValue] !== "undefined") {
                            if (memberValue === cluster[member][memberValue][this.meta.RealValueName]) {
                                cluster[member][memberValue][this.meta.MembersProportionName]++;
                            } else {
                                throw "The value '" + memberValue + "' for the member '" + member + "' was already defined as a different type (" + typeof cluster[member][memberValue][this.meta.RealValueName] + ")";
                            }
                        } else {
                            (cluster[member][memberValue] = {})[this.meta.MembersProportionName] = 1;
                            cluster[member][memberValue][this.meta.RealValueName] = memberValue;
                            cluster[member][memberValue][this.meta.MembersToIgnoreName] = new IngoneMe().add(member, ignoreKeys);
                        }
                    }
                }
            }

            for (var mappedMember in cluster) {
                if (!(mappedMember.indexOf("$$$$") === 0)) {
                    if (!cluster[this.meta.MembersToIgnoreName].contains(mappedMember)) {
                        var memberData = cluster[mappedMember];
                        for (var mappedData in memberData) {
                            if (!(mappedData.indexOf("$$$$") === 0)) {
                                var queryResult = did.getWhere(mappedMember, memberData[mappedData][this.meta.RealValueName]);
                                if (Object.prototype.toString.call(queryResult) === '[object Array]') {
                                    this.rebuildClusters(new DynamicallyIndexedData(queryResult), cluster[mappedMember][mappedData]);
                                }
                            }
                        }
                    }
                }
            }

            return cluster;
        };

        Data.prototype.getChancesFor = function (data) {
            var cluster = this.clusters;
            for (var filterMember in data) {
                if (data[filterMember] !== null) {
                    if (typeof cluster[filterMember] !== "undefined") {
                        if (typeof cluster[filterMember][data[filterMember]] !== "undefined") {
                            if (cluster[filterMember][data[filterMember]][this.meta.RealValueName] === data[filterMember]) {
                                cluster = cluster[filterMember][data[filterMember]];
                            } else {
                                return { Data: {}, Error: "Type mismatch for ('" + filterMember + "'='" + data[filterMember] + "')" };
                            }
                        } else {
                            return { Data: {}, Error: "No records were found for the given filter ('" + filterMember + "'='" + data[filterMember] + "')" };
                        }
                    } else {
                        return { Data: null, Error: "Impossible to filter by unmaped feature '" + filterMember + "'" };
                    }
                }
            }

            var result = { Data: {}, Error: null };
            try  {
                for (var feature in cluster) {
                    if (!(feature.indexOf("$$$$") === 0)) {
                        var betterFeature = null;
                        var betterChancesValue = -1;
                        var featureCount = 0;
                        for (var featureInfo in cluster[feature]) {
                            if (!(featureInfo.indexOf("$$$$") === 0)) {
                                featureCount++;
                                if ((betterChancesValue === -1) || (cluster[feature][featureInfo][this.meta.MembersProportionName] > betterChancesValue)) {
                                    betterFeature = featureInfo;
                                    betterChancesValue = cluster[feature][featureInfo][this.meta.MembersProportionName];
                                }
                            }
                        }
                        if ((betterFeature !== null) && (featureCount > 0)) {
                            result.Data[feature] = {
                                BestChance: betterFeature,
                                Proportion: featureCount === 1 ? featureCount : betterChancesValue / cluster[feature][this.meta.MembersProportionName]
                            };
                        }
                    }
                }
            } catch (E) {
                throw E;
            }
            return result;
        };
        return Data;
    })();
    P.Data = Data;

    var DynamicallyIndexedData = (function () {
        function DynamicallyIndexedData(dataSet) {
            this.keys = {};
            this.rawDataSet = dataSet;
        }
        DynamicallyIndexedData.prototype.getAllIndexedKeys = function () {
            return this.keys;
        };

        DynamicallyIndexedData.prototype.getRawDataSet = function () {
            return this.rawDataSet;
        };

        DynamicallyIndexedData.prototype.getWhere = function (memberName, value) {
            if (typeof value === "object") {
                throw "Only 'plain' values are supported at the time";
            }

            if (typeof this.keys[memberName] === "undefined") {
                this.keys[memberName] = {};
            }

            if (typeof this.keys[memberName][value] === "undefined") {
                this.keys[memberName][value] = [];
                for (var dataIndex = 0; dataIndex < this.rawDataSet.length; dataIndex++) {
                    if ((typeof this.rawDataSet[dataIndex][memberName] !== "undefined") && this.rawDataSet[dataIndex][memberName] === value) {
                        this.keys[memberName][value].push(this.rawDataSet[dataIndex]);
                    }
                }
            }
            return this.keys[memberName][value];
        };
        return DynamicallyIndexedData;
    })();
    P.DynamicallyIndexedData = DynamicallyIndexedData;
})(P || (P = {}));

var F = (function () {
    function F() {
    }
    F.Y = function (f) {
        return (function (x) {
            return f(function (x1) {
                return (x(x))(x1);
            });
        })(function (x) {
            return f(function (y) {
                return (x(x))(y);
            });
        });
    };
    return F;
})();

var CancerData = (function () {
    function CancerData() {
    }
    return CancerData;
})();

var pData = new P.Data();
