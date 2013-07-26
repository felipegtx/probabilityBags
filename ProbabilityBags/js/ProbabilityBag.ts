module P {

    export class Numerical {
        private clusters: any;
        private data: Array<number>;

        constructor(data: Array<number>) {
            this.clusters = this.rebuildClusters(this.data = data);
        }

        rebuildClusters(data: Array) {
            var clusters = {};
            for (var i = 0; i < data.length; i++) {
                if (clusters[data[i]]) { clusters[data[i]]++; }
                else { clusters[data[i]] = 1; }
            }
            return clusters;
        }

        given(to: any) {
            if (!this.clusters[to]) { return 0; }
            else {
                return (this.clusters[this.data[to]] / this.data.length);
            }
        }
    }

    export class IngoneMe {

        private keys: {};

        constructor() { this.keys = {}; }

        getAll(): {} { return this.keys; }

        add(key: string, parent?: {}) {
            if (typeof parent !== "undefined") {
                for (var pKey in parent) { this.add(pKey); }
            }
            if (!this.contains(key)) {
                this.keys[key] = null;
            }
            return this;
        }

        contains(key: string) {
            return (key in this.keys);
        }

    }

    export class Data<Type> {

        private meta = {
            MembersProportionName: "$$$$Prop",
            MembersToIgnoreName: "$$$$Ingnore",
            RealValueName: "$$$$RealValue"
        };
        private clusters: any;

        constructor(data?: Array<Type>) {
            if (typeof data !== "undefined") {
                this.addMany(data);
            }
        }

        public addMany(items: Array<Type>) {
            this.clusters = this.rebuildClusters(new DynamicallyIndexedData(items));
        }

        public getClusters() { return this.clusters; }

        public rebuildClusters(did: DynamicallyIndexedData, clusterData?: {}): any {

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
                        if (typeof memberValue === "object") {/* Only 'plain' values are supported at the time*/continue; }

                        /// In case we already have that member mapped before
                        if (typeof cluster[member] === "undefined") {
                            (cluster[member] = {})[this.meta.MembersProportionName] = 0;
                        }
                        cluster[member][this.meta.MembersProportionName]++;

                        /// Main recorrence count
                        if (typeof cluster[member][memberValue] !== "undefined") {
                            if (memberValue === cluster[member][memberValue][this.meta.RealValueName]) {
                                cluster[member][memberValue][this.meta.MembersProportionName]++;
                            } else {
                                throw "The value '" + memberValue + "' for the member '" + member + "' was already defined as a different type ("
                                    + typeof cluster[member][memberValue][this.meta.RealValueName] + ")";
                            }
                        }
                        else {
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
        }

        public getChancesFor(data: Type) {
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
                    }
                    else {
                        return { Data: null, Error: "Impossible to filter by unmaped feature '" + filterMember + "'" };
                    }
                }
            }

            var result = { Data: {}, Error: null };
            try
            {
                for (var feature in cluster) {
                    if (!(feature.indexOf("$$$$") === 0)) {
                        var betterFeature = null;
                        var betterChancesValue = -1;
                        var featureCount = 0;
                        for (var featureInfo in cluster[feature]) {
                            if (!(featureInfo.indexOf("$$$$") === 0)) {
                                featureCount++;
                                if ((betterChancesValue === -1) ||
                                    (cluster[feature][featureInfo][this.meta.MembersProportionName] > betterChancesValue)) {
                                    betterFeature = featureInfo;
                                    betterChancesValue = cluster[feature][featureInfo][this.meta.MembersProportionName];
                                }
                            }
                        }
                        if ((betterFeature !== null) && (featureCount > 0)) {
                            result.Data[feature] = {
                                BestChance: betterFeature,
                                Proportion: featureCount === 1 ?
                                featureCount :
                                betterChancesValue / cluster[feature][this.meta.MembersProportionName]
                            };
                        }
                    }
                }
            }
            catch (E) { throw E;  /*just so we cant 'break point' it*/}
            return result;
        }
    }

    export class DynamicallyIndexedData {
        private keys: {};
        private rawDataSet: Array;

        constructor(dataSet: Array<any>) {
            this.keys = {};
            this.rawDataSet = dataSet;
        }

        public getAllIndexedKeys(): {} { return this.keys; }

        public getRawDataSet(): Array { return this.rawDataSet; }

        public getWhere(memberName: string, value: any) {

            if (typeof value === "object") { throw "Only 'plain' values are supported at the time"; }

            if (typeof this.keys[memberName] === "undefined") {
                this.keys[memberName] = {};
            }

            if (typeof this.keys[memberName][value] === "undefined") {
                this.keys[memberName][value] = [];
                for (var dataIndex = 0; dataIndex < this.rawDataSet.length; dataIndex++) {
                    if ((typeof this.rawDataSet[dataIndex][memberName] !== "undefined")
                        && this.rawDataSet[dataIndex][memberName] === value) {
                        this.keys[memberName][value].push(this.rawDataSet[dataIndex]);
                    }
                }
            }
            return this.keys[memberName][value];
        }
    }
}

class F {
    public static Y(f: (F) => {}) {
        return (function (x) {
            return f(function (x1) {
                return (x(x))(x1);
            });
        })(function (x) {
                return f(function (y) { return (x(x))(y); })
            });
    }
}

class CancerData {
    type: string;
    age: number;
    chemotherapy: boolean;
    radiotherapy: boolean;
    cured: boolean;
}

var pData = new P.Data<CancerData>();
