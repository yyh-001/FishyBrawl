const mongoose = require('mongoose');

const minionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    attack: {
        type: Number,
        required: true,
        min: 0
    },
    health: {
        type: Number,
        required: true,
        min: 1
    },
    tier: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    },
    tribe: {
        type: String,
        enum: ['murloc', 'beast', 'demon', 'dragon', 'mech', 'pirate', 'elemental', 'quilboar', 'naga', 'undead', 'all', 'none'],
        default: 'none'
    },
    abilities: [{
        type: String,
        enum: [
            'taunt',
            'divine_shield',
            'poisonous',
            'windfury',
            'reborn',
            'magnetic',
            'charge',
            'stealth',
            'cleave',
            'overkill',
            'frenzy'
        ]
    }],
    battlecry: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    deathrattle: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    description: {
        type: String,
        default: ''
    },
    isToken: {
        type: Boolean,
        default: false
    },
    tokenOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Minion',
        default: null
    },
    summonedMinions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Minion'
    }],
    keywords: [{
        type: String
    }],
    artist: {
        type: String,
        default: 'Unknown'
    },
    flavorText: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// 添加索引
minionSchema.index({ tier: 1 });
minionSchema.index({ tribe: 1 });
minionSchema.index({ name: 1 });

// 添加虚拟字段
minionSchema.virtual('stats').get(function() {
    return `${this.attack}/${this.health}`;
});

// 添加实例方法
minionSchema.methods.buff = function(attack, health) {
    this.attack += attack;
    this.health += health;
    return this.save();
};

// 添加静态方法
minionSchema.statics.findByTier = function(tier) {
    return this.find({ tier });
};

minionSchema.statics.findByTribe = function(tribe) {
    return this.find({ tribe });
};

// 中间件
minionSchema.pre('save', function(next) {
    // 确保攻击力和生命值不小于0
    if (this.attack < 0) this.attack = 0;
    if (this.health < 1) this.health = 1;
    next();
});

const Minion = mongoose.model('Minion', minionSchema);

module.exports = Minion; 