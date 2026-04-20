import type { Person } from '../types';
import type { LocalData } from '../store/localDb';
import { isEnglish } from '../i18n';

function createHanDynasty(): LocalData {
  const ids = {
    liuTaiGong: 'han-001', // 刘太公 (刘煓)
    liuBang: 'han-002',    // 刘邦 (汉高祖)
    lvZhi: 'han-003',      // 吕雉 (吕后)
    qiFuRen: 'han-004',    // 戚夫人
    boJi: 'han-005',       // 薄姬
    liuYing: 'han-006',    // 刘盈 (汉惠帝)
    liuRuYi: 'han-007',    // 刘如意
    liuHeng: 'han-008',    // 刘恒 (汉文帝)
    douYi: 'han-009',      // 窦漪房 (窦皇后)
    liuQi: 'han-010',      // 刘启 (汉景帝)
    wangZhi: 'han-011',    // 王娡 (王皇后)
    liWangHou: 'han-012',  // 栗姬
    liuChe: 'han-013',     // 刘彻 (汉武帝)
    chenAJiao: 'han-014',  // 陈阿娇
    weiZiFu: 'han-015',    // 卫子夫
    liuJu: 'han-016',      // 刘据 (戾太子)
    liuFuLing: 'han-017',  // 刘弗陵 (汉昭帝)
    gouYiFuRen: 'han-018', // 钩弋夫人
    liuBingYi: 'han-019',  // 刘病已 (汉宣帝/刘询)
    liuShi: 'han-020',     // 刘奭 (汉元帝)
    liuAo: 'han-021',      // 刘骜 (汉成帝)
    liuRong: 'han-022',    // 刘荣 (废太子)
    liuJin: 'han-023',     // 刘进 (史皇孙)
    wangWengXu: 'han-024', // 王翁须
  };

  const persons: Record<string, Person> = {
    [ids.liuTaiGong]: {
      id: ids.liuTaiGong, name: '刘太公', gender: 'male', generation: 1,
      title: '太上皇', bio: '刘邦之父',
      spouseIds: [], childrenIds: [ids.liuBang], parentIds: [], collapsed: false,
    },
    [ids.liuBang]: {
      id: ids.liuBang, name: '刘邦', gender: 'male', generation: 2,
      birthYear: -256, deathYear: '-195', title: '汉高祖',
      bio: '汉朝开国皇帝，灭秦败楚，建立大汉王朝',
      spouseIds: [ids.lvZhi, ids.qiFuRen, ids.boJi],
      childrenIds: [ids.liuYing, ids.liuRuYi, ids.liuHeng],
      parentIds: [ids.liuTaiGong], collapsed: false,
    },
    [ids.lvZhi]: {
      id: ids.lvZhi, name: '吕雉', gender: 'female', generation: 2,
      deathYear: '-180', title: '皇后/太后',
      bio: '汉高祖皇后，中国历史上第一位临朝称制的女性',
      spouseIds: [ids.liuBang], childrenIds: [ids.liuYing], parentIds: [], collapsed: false,
    },
    [ids.qiFuRen]: {
      id: ids.qiFuRen, name: '戚夫人', gender: 'female', generation: 2,
      title: '夫人', bio: '汉高祖宠姬',
      spouseIds: [ids.liuBang], childrenIds: [ids.liuRuYi], parentIds: [], collapsed: false,
    },
    [ids.boJi]: {
      id: ids.boJi, name: '薄姬', gender: 'female', generation: 2,
      title: '太后', bio: '汉文帝之母',
      spouseIds: [ids.liuBang], childrenIds: [ids.liuHeng], parentIds: [], collapsed: false,
    },
    [ids.liuYing]: {
      id: ids.liuYing, name: '刘盈', gender: 'male', generation: 3,
      birthYear: -210, deathYear: '-188', title: '汉惠帝',
      bio: '汉朝第二位皇帝',
      spouseIds: [], childrenIds: [], parentIds: [ids.liuBang, ids.lvZhi], collapsed: false,
    },
    [ids.liuRuYi]: {
      id: ids.liuRuYi, name: '刘如意', gender: 'male', generation: 3,
      title: '赵隐王', bio: '刘邦与戚夫人之子',
      spouseIds: [], childrenIds: [], parentIds: [ids.liuBang, ids.qiFuRen], collapsed: false,
    },
    [ids.liuHeng]: {
      id: ids.liuHeng, name: '刘恒', gender: 'male', generation: 3,
      birthYear: -203, deathYear: '-157', title: '汉文帝',
      bio: '汉朝第五位皇帝，开创文景之治',
      spouseIds: [ids.douYi], childrenIds: [ids.liuQi],
      parentIds: [ids.liuBang, ids.boJi], collapsed: false,
    },
    [ids.douYi]: {
      id: ids.douYi, name: '窦漪房', gender: 'female', generation: 3,
      title: '皇后/太皇太后', bio: '汉文帝皇后',
      spouseIds: [ids.liuHeng], childrenIds: [ids.liuQi], parentIds: [], collapsed: false,
    },
    [ids.liuQi]: {
      id: ids.liuQi, name: '刘启', gender: 'male', generation: 4,
      birthYear: -188, deathYear: '-141', title: '汉景帝',
      bio: '文景之治的缔造者之一',
      spouseIds: [ids.wangZhi, ids.liWangHou],
      childrenIds: [ids.liuChe, ids.liuRong],
      parentIds: [ids.liuHeng, ids.douYi], collapsed: false,
    },
    [ids.wangZhi]: {
      id: ids.wangZhi, name: '王娡', gender: 'female', generation: 4,
      title: '皇后/皇太后', bio: '汉景帝皇后，汉武帝之母',
      spouseIds: [ids.liuQi], childrenIds: [ids.liuChe],
      parentIds: [], collapsed: false,
    },
    [ids.liWangHou]: {
      id: ids.liWangHou, name: '栗姬', gender: 'female', generation: 4,
      title: '栗姬', bio: '汉景帝妃嫔，废太子刘荣之母',
      spouseIds: [ids.liuQi], childrenIds: [ids.liuRong],
      parentIds: [], collapsed: false,
    },
    [ids.liuRong]: {
      id: ids.liuRong, name: '刘荣', gender: 'male', generation: 5,
      title: '临江闵王', bio: '汉景帝长子，曾为太子后被废',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.liuQi, ids.liWangHou], collapsed: false,
    },
    [ids.liuChe]: {
      id: ids.liuChe, name: '刘彻', gender: 'male', generation: 5,
      birthYear: -156, deathYear: '-87', title: '汉武帝',
      bio: '雄才大略，开疆拓土，罢黜百家独尊儒术',
      spouseIds: [ids.chenAJiao, ids.weiZiFu, ids.gouYiFuRen],
      childrenIds: [ids.liuJu, ids.liuFuLing],
      parentIds: [ids.liuQi, ids.wangZhi], collapsed: false,
    },
    [ids.chenAJiao]: {
      id: ids.chenAJiao, name: '陈阿娇', gender: 'female', generation: 5,
      title: '皇后（废）', bio: '汉武帝第一任皇后，金屋藏娇典故',
      spouseIds: [ids.liuChe], childrenIds: [], parentIds: [], collapsed: false,
    },
    [ids.weiZiFu]: {
      id: ids.weiZiFu, name: '卫子夫', gender: 'female', generation: 5,
      title: '皇后', bio: '汉武帝第二任皇后，卫青之姐',
      spouseIds: [ids.liuChe], childrenIds: [ids.liuJu], parentIds: [], collapsed: false,
    },
    [ids.gouYiFuRen]: {
      id: ids.gouYiFuRen, name: '钩弋夫人', gender: 'female', generation: 5,
      title: '夫人', bio: '汉武帝妃嫔，汉昭帝之母',
      spouseIds: [ids.liuChe], childrenIds: [ids.liuFuLing], parentIds: [], collapsed: false,
    },
    [ids.liuJu]: {
      id: ids.liuJu, name: '刘据', gender: 'male', generation: 6,
      birthYear: -128, deathYear: '-91', title: '戾太子',
      bio: '汉武帝嫡长子，巫蛊之祸中自杀',
      spouseIds: [], childrenIds: [ids.liuJin],
      parentIds: [ids.liuChe, ids.weiZiFu], collapsed: false,
    },
    [ids.liuFuLing]: {
      id: ids.liuFuLing, name: '刘弗陵', gender: 'male', generation: 6,
      birthYear: -94, deathYear: '-74', title: '汉昭帝',
      bio: '汉朝第八位皇帝',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.liuChe, ids.gouYiFuRen], collapsed: false,
    },
    [ids.liuJin]: {
      id: ids.liuJin, name: '刘进', gender: 'male', generation: 7,
      title: '史皇孙', bio: '刘据之子',
      spouseIds: [ids.wangWengXu], childrenIds: [ids.liuBingYi],
      parentIds: [ids.liuJu], collapsed: false,
    },
    [ids.wangWengXu]: {
      id: ids.wangWengXu, name: '王翁须', gender: 'female', generation: 7,
      title: '悼后', bio: '史皇孙之妻',
      spouseIds: [ids.liuJin], childrenIds: [ids.liuBingYi], parentIds: [], collapsed: false,
    },
    [ids.liuBingYi]: {
      id: ids.liuBingYi, name: '刘询', gender: 'male', generation: 8,
      birthYear: -91, deathYear: '-49', title: '汉宣帝',
      bio: '中兴之主，原名刘病已，在民间长大后即位',
      spouseIds: [], childrenIds: [ids.liuShi],
      parentIds: [ids.liuJin, ids.wangWengXu], collapsed: false,
    },
    [ids.liuShi]: {
      id: ids.liuShi, name: '刘奭', gender: 'male', generation: 9,
      birthYear: -74, deathYear: '-33', title: '汉元帝',
      bio: '汉朝第十一位皇帝',
      spouseIds: [], childrenIds: [ids.liuAo],
      parentIds: [ids.liuBingYi], collapsed: false,
    },
    [ids.liuAo]: {
      id: ids.liuAo, name: '刘骜', gender: 'male', generation: 10,
      birthYear: -51, deathYear: '-7', title: '汉成帝',
      bio: '汉朝第十二位皇帝',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.liuShi], collapsed: false,
    },
  };

  return {
    persons,
    siblingOrder: {},
    spouseOrder: {},
    selectedPersonId: ids.liuBang,
    currentTree: null,
    treeNames: {},
  };
}

function createShengFamily(): LocalData {
  const ids = {
    shengLaoTaiTai: 'sheng-001',  // 盛老太太 (勇毅侯独女)
    shengDaLaoYe: 'sheng-002',    // 盛老太爷 (盛维的父亲)
    shengHong: 'sheng-003',       // 盛紘
    wangRuoFu: 'sheng-004',      // 王若弗 (大娘子)
    linQinShuang: 'sheng-005',   // 林噙霜 (林小娘)
    weiXiaoNiang: 'sheng-006',   // 卫小娘
    shengHua: 'sheng-007',       // 盛华兰 (大姐)
    shengRu: 'sheng-008',        // 盛如兰 (五姐)
    shengMo: 'sheng-009',        // 盛墨兰 (四姐)
    shengMingLan: 'sheng-010',   // 盛明兰 (六姑娘)
    shengChangBai: 'sheng-011',  // 盛长柏 (二哥)
    shengChangFeng: 'sheng-012', // 盛长枫 (三哥)
    guTingYe: 'sheng-013',       // 顾廷烨
    qiHeng: 'sheng-014',         // 齐衡 (齐小公爷)
    haiShiHou: 'sheng-015',      // 海氏 (海朝云)
    yuanWenShao: 'sheng-016',    // 袁文绍
    liangHan: 'sheng-017',       // 梁晗
    shengWei: 'sheng-018',       // 盛维 (盛紘堂兄)
    shengFenLan: 'sheng-019',    // 盛淑兰 (堂姐)
    sunXiuCai: 'sheng-020',      // 孙志高 (秀才)
    tuanGe: 'sheng-021',         // 团哥儿 (明兰之子)
    shengChangDong: 'sheng-022', // 盛长栋 (四弟)
    shengPinLan: 'sheng-023',    // 盛品兰 (堂姐)
  };

  const persons: Record<string, Person> = {
    [ids.shengLaoTaiTai]: {
      id: ids.shengLaoTaiTai, name: '盛老太太', gender: 'female', generation: 1,
      title: '勇毅侯独女', bio: '盛家最高辈分，明兰的祖母和庇护者',
      spouseIds: [], childrenIds: [ids.shengHong],
      parentIds: [], collapsed: false,
    },
    [ids.shengDaLaoYe]: {
      id: ids.shengDaLaoYe, name: '盛老太爷', gender: 'male', generation: 1,
      title: '盛家老太爷', bio: '盛紘之父（已故），盛维之伯父',
      spouseIds: [], childrenIds: [ids.shengHong, ids.shengWei],
      parentIds: [], collapsed: false,
    },
    [ids.shengHong]: {
      id: ids.shengHong, name: '盛紘', gender: 'male', generation: 2,
      title: '官至三品', bio: '盛家主君，五品官起步后官运亨通',
      spouseIds: [ids.wangRuoFu, ids.linQinShuang, ids.weiXiaoNiang],
      childrenIds: [ids.shengHua, ids.shengChangBai, ids.shengChangFeng, ids.shengMo, ids.shengRu, ids.shengMingLan, ids.shengChangDong],
      parentIds: [ids.shengLaoTaiTai, ids.shengDaLaoYe], collapsed: false,
    },
    [ids.wangRuoFu]: {
      id: ids.wangRuoFu, name: '王若弗', gender: 'female', generation: 2,
      title: '大娘子', bio: '盛紘正妻，王家嫡女，性格直率',
      spouseIds: [ids.shengHong],
      childrenIds: [ids.shengHua, ids.shengChangBai, ids.shengRu],
      parentIds: [], collapsed: false,
    },
    [ids.linQinShuang]: {
      id: ids.linQinShuang, name: '林噙霜', gender: 'female', generation: 2,
      title: '林小娘', bio: '盛紘妾室，心机深沉',
      spouseIds: [ids.shengHong],
      childrenIds: [ids.shengChangFeng, ids.shengMo],
      parentIds: [], collapsed: false,
    },
    [ids.weiXiaoNiang]: {
      id: ids.weiXiaoNiang, name: '卫小娘', gender: 'female', generation: 2,
      title: '卫小娘', bio: '盛紘妾室，明兰生母，温婉善良，不幸早逝',
      spouseIds: [ids.shengHong],
      childrenIds: [ids.shengMingLan, ids.shengChangDong],
      parentIds: [], collapsed: false,
    },
    [ids.shengHua]: {
      id: ids.shengHua, name: '盛华兰', gender: 'female', generation: 3,
      title: '大姐姐', bio: '盛家嫡长女，嫁忠勤伯爵府袁文绍',
      spouseIds: [ids.yuanWenShao], childrenIds: [],
      parentIds: [ids.shengHong, ids.wangRuoFu], collapsed: false,
    },
    [ids.shengChangBai]: {
      id: ids.shengChangBai, name: '盛长柏', gender: 'male', generation: 3,
      title: '二哥哥', bio: '盛家嫡长子，性格沉稳，后高中进士',
      spouseIds: [ids.haiShiHou], childrenIds: [],
      parentIds: [ids.shengHong, ids.wangRuoFu], collapsed: false,
    },
    [ids.shengChangFeng]: {
      id: ids.shengChangFeng, name: '盛长枫', gender: 'male', generation: 3,
      title: '三哥哥', bio: '林小娘庶子',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.shengHong, ids.linQinShuang], collapsed: false,
    },
    [ids.shengMo]: {
      id: ids.shengMo, name: '盛墨兰', gender: 'female', generation: 3,
      title: '四姐姐', bio: '林小娘庶女，嫁梁晗',
      spouseIds: [ids.liangHan], childrenIds: [],
      parentIds: [ids.shengHong, ids.linQinShuang], collapsed: false,
    },
    [ids.shengRu]: {
      id: ids.shengRu, name: '盛如兰', gender: 'female', generation: 3,
      title: '五姐姐', bio: '盛家嫡次女，性格爽利',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.shengHong, ids.wangRuoFu], collapsed: false,
    },
    [ids.shengMingLan]: {
      id: ids.shengMingLan, name: '盛明兰', gender: 'female', generation: 3,
      title: '六姑娘', bio: '故事主角，聪慧隐忍，嫁顾廷烨后执掌侯府',
      spouseIds: [ids.guTingYe], childrenIds: [ids.tuanGe],
      parentIds: [ids.shengHong, ids.weiXiaoNiang], collapsed: false,
    },
    [ids.shengChangDong]: {
      id: ids.shengChangDong, name: '盛长栋', gender: 'male', generation: 3,
      title: '四弟弟', bio: '卫小娘庶子',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.shengHong, ids.weiXiaoNiang], collapsed: false,
    },
    [ids.guTingYe]: {
      id: ids.guTingYe, name: '顾廷烨', gender: 'male', generation: 3,
      title: '宁远侯', bio: '明兰之夫，顾家二郎，文武双全',
      spouseIds: [ids.shengMingLan], childrenIds: [ids.tuanGe],
      parentIds: [], collapsed: false,
    },
    [ids.qiHeng]: {
      id: ids.qiHeng, name: '齐衡', gender: 'male', generation: 3,
      title: '齐小公爷', bio: '齐国公之子，与明兰有过情愫',
      spouseIds: [], childrenIds: [],
      parentIds: [], collapsed: false,
    },
    [ids.haiShiHou]: {
      id: ids.haiShiHou, name: '海朝云', gender: 'female', generation: 3,
      title: '海氏', bio: '盛长柏之妻，知书达理',
      spouseIds: [ids.shengChangBai], childrenIds: [],
      parentIds: [], collapsed: false,
    },
    [ids.yuanWenShao]: {
      id: ids.yuanWenShao, name: '袁文绍', gender: 'male', generation: 3,
      title: '忠勤伯爵府', bio: '盛华兰之夫',
      spouseIds: [ids.shengHua], childrenIds: [],
      parentIds: [], collapsed: false,
    },
    [ids.liangHan]: {
      id: ids.liangHan, name: '梁晗', gender: 'male', generation: 3,
      title: '永昌伯爵之子', bio: '盛墨兰之夫',
      spouseIds: [ids.shengMo], childrenIds: [],
      parentIds: [], collapsed: false,
    },
    [ids.shengWei]: {
      id: ids.shengWei, name: '盛维', gender: 'male', generation: 2,
      title: '宥阳盛家', bio: '盛紘堂兄，经营宥阳盛家家业',
      spouseIds: [], childrenIds: [ids.shengFenLan, ids.shengPinLan],
      parentIds: [ids.shengDaLaoYe], collapsed: false,
    },
    [ids.shengFenLan]: {
      id: ids.shengFenLan, name: '盛淑兰', gender: 'female', generation: 3,
      title: '堂姐', bio: '盛维之女，最初嫁孙秀才，后和离',
      spouseIds: [ids.sunXiuCai], childrenIds: [],
      parentIds: [ids.shengWei], collapsed: false,
    },
    [ids.shengPinLan]: {
      id: ids.shengPinLan, name: '盛品兰', gender: 'female', generation: 3,
      title: '堂妹', bio: '盛维之女',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.shengWei], collapsed: false,
    },
    [ids.sunXiuCai]: {
      id: ids.sunXiuCai, name: '孙志高', gender: 'male', generation: 3,
      title: '秀才', bio: '盛淑兰前夫，不学无术',
      spouseIds: [ids.shengFenLan], childrenIds: [],
      parentIds: [], collapsed: false,
    },
    [ids.tuanGe]: {
      id: ids.tuanGe, name: '团哥儿', gender: 'male', generation: 4,
      title: '团哥儿', bio: '明兰与顾廷烨之子',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.shengMingLan, ids.guTingYe], collapsed: false,
    },
  };

  return {
    persons,
    siblingOrder: {},
    spouseOrder: {},
    selectedPersonId: ids.shengMingLan,
    currentTree: null,
    treeNames: {},
  };
}

function createGameOfThrones(): LocalData {
  const ids = {
    rickard: 'got-001',      // Rickard Stark
    brandon: 'got-002',       // Brandon Stark (elder)
    eddard: 'got-003',        // Eddard Stark
    catelyn: 'got-004',       // Catelyn Tully
    lyanna: 'got-005',        // Lyanna Stark
    benjen: 'got-006',        // Benjen Stark
    robb: 'got-007',          // Robb Stark
    sansa: 'got-008',         // Sansa Stark
    arya: 'got-009',          // Arya Stark
    bran: 'got-010',          // Bran Stark
    rickon: 'got-011',        // Rickon Stark
    jonSnow: 'got-012',       // Jon Snow
    rhaegar: 'got-013',       // Rhaegar Targaryen
    aerys: 'got-014',         // Aerys II Targaryen
    rhaella: 'got-015',       // Rhaella Targaryen
    daenerys: 'got-016',      // Daenerys Targaryen
    viserys: 'got-017',       // Viserys Targaryen
    cersei: 'got-018',        // Cersei Lannister
    jaime: 'got-019',         // Jaime Lannister
    tyrion: 'got-020',        // Tyrion Lannister
    joffrey: 'got-021',       // Joffrey Baratheon
    myrcella: 'got-022',      // Myrcella Baratheon
    tommen: 'got-023',        // Tommen Baratheon
    tywin: 'got-024',         // Tywin Lannister
    joanna: 'got-025',        // Joanna Lannister
  };

  const persons: Record<string, Person> = {
    [ids.rickard]: {
      id: ids.rickard, name: 'Rickard Stark', gender: 'male', generation: 1,
      title: 'Lord of Winterfell', bio: 'Lord of Winterfell, burned alive by Aerys II',
      spouseIds: [], childrenIds: [ids.brandon, ids.eddard, ids.lyanna, ids.benjen],
      parentIds: [], collapsed: false,
    },
    [ids.brandon]: {
      id: ids.brandon, name: 'Brandon Stark', gender: 'male', generation: 2,
      title: 'Eldest son', bio: 'Ned\'s elder brother, strangled by Aerys II',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.rickard], collapsed: false,
    },
    [ids.eddard]: {
      id: ids.eddard, name: 'Eddard Stark', gender: 'male', generation: 2,
      birthYear: 263, deathYear: '298', title: 'Hand of the King',
      bio: 'Lord of Winterfell, Warden of the North',
      spouseIds: [ids.catelyn], childrenIds: [ids.robb, ids.sansa, ids.arya, ids.bran, ids.rickon],
      parentIds: [ids.rickard], collapsed: false,
    },
    [ids.catelyn]: {
      id: ids.catelyn, name: 'Catelyn Tully', gender: 'female', generation: 2,
      deathYear: '299', title: 'Lady Stark',
      bio: 'Daughter of Hoster Tully, wife of Eddard Stark',
      spouseIds: [ids.eddard], childrenIds: [ids.robb, ids.sansa, ids.arya, ids.bran, ids.rickon],
      parentIds: [], collapsed: false,
    },
    [ids.lyanna]: {
      id: ids.lyanna, name: 'Lyanna Stark', gender: 'female', generation: 2,
      deathYear: '283', title: 'She-Wolf',
      bio: 'Sister of Eddard, mother of Jon Snow',
      spouseIds: [ids.rhaegar], childrenIds: [ids.jonSnow],
      parentIds: [ids.rickard], collapsed: false,
    },
    [ids.benjen]: {
      id: ids.benjen, name: 'Benjen Stark', gender: 'male', generation: 2,
      title: 'First Ranger', bio: 'Uncle of the Stark children, man of the Night\'s Watch',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.rickard], collapsed: false,
    },
    [ids.robb]: {
      id: ids.robb, name: 'Robb Stark', gender: 'male', generation: 3,
      birthYear: 285, deathYear: '299', title: 'King in the North',
      bio: 'Eldest son of Eddard and Catelyn, betrayed at the Red Wedding',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.eddard, ids.catelyn], collapsed: false,
    },
    [ids.sansa]: {
      id: ids.sansa, name: 'Sansa Stark', gender: 'female', generation: 3,
      birthYear: 287, title: 'Lady of Winterfell',
      bio: 'Eldest daughter, survived King\'s Landing and became Lady of Winterfell',
      spouseIds: [ids.tyrion], childrenIds: [],
      parentIds: [ids.eddard, ids.catelyn], collapsed: false,
    },
    [ids.arya]: {
      id: ids.arya, name: 'Arya Stark', gender: 'female', generation: 3,
      birthYear: 289, title: 'No One',
      bio: 'Trained as a Faceless Man, deadly swordswoman',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.eddard, ids.catelyn], collapsed: false,
    },
    [ids.bran]: {
      id: ids.bran, name: 'Bran Stark', gender: 'male', generation: 3,
      birthYear: 290, title: 'The Three-Eyed Raven',
      bio: 'Fell from a tower, became the Three-Eyed Raven',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.eddard, ids.catelyn], collapsed: false,
    },
    [ids.rickon]: {
      id: ids.rickon, name: 'Rickon Stark', gender: 'male', generation: 3,
      birthYear: 295, deathYear: '303', title: 'Youngest Stark',
      bio: 'Youngest son of Eddard and Catelyn',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.eddard, ids.catelyn], collapsed: false,
    },
    [ids.jonSnow]: {
      id: ids.jonSnow, name: 'Jon Snow', gender: 'male', generation: 3,
      birthYear: 282, title: 'King in the North',
      bio: 'Raised as Ned\'s bastard, actually son of Lyanna and Rhaegar',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.lyanna, ids.rhaegar], collapsed: false,
    },
    [ids.aerys]: {
      id: ids.aerys, name: 'Aerys Targaryen', gender: 'male', generation: 1,
      deathYear: '283', title: 'The Mad King',
      bio: 'Last Targaryen king, slain by Jaime Lannister',
      spouseIds: [ids.rhaella], childrenIds: [ids.rhaegar, ids.viserys, ids.daenerys],
      parentIds: [], collapsed: false,
    },
    [ids.rhaella]: {
      id: ids.rhaella, name: 'Rhaella Targaryen', gender: 'female', generation: 1,
      deathYear: '284', title: 'Queen',
      bio: 'Wife of Aerys II, mother of Rhaegar, Viserys, and Daenerys',
      spouseIds: [ids.aerys], childrenIds: [ids.rhaegar, ids.viserys, ids.daenerys],
      parentIds: [], collapsed: false,
    },
    [ids.rhaegar]: {
      id: ids.rhaegar, name: 'Rhaegar Targaryen', gender: 'male', generation: 2,
      deathYear: '283', title: 'Prince of Dragonstone',
      bio: 'Eldest son of the Mad King, father of Jon Snow',
      spouseIds: [ids.lyanna], childrenIds: [ids.jonSnow],
      parentIds: [ids.aerys, ids.rhaella], collapsed: false,
    },
    [ids.viserys]: {
      id: ids.viserys, name: 'Viserys Targaryen', gender: 'male', generation: 2,
      deathYear: '298', title: 'Beggar King',
      bio: 'Exiled Targaryen prince, sold his sister Daenerys',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.aerys, ids.rhaella], collapsed: false,
    },
    [ids.daenerys]: {
      id: ids.daenerys, name: 'Daenerys Targaryen', gender: 'female', generation: 2,
      birthYear: 284, deathYear: '305', title: 'Mother of Dragons',
      bio: 'Stormborn, conqueror, liberator of Slaver\'s Bay',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.aerys, ids.rhaella], collapsed: false,
    },
    [ids.tywin]: {
      id: ids.tywin, name: 'Tywin Lannister', gender: 'male', generation: 1,
      deathYear: '300', title: 'Hand of the King',
      bio: 'Lord of Casterly Rock, richest man in Westeros',
      spouseIds: [ids.joanna], childrenIds: [ids.cersei, ids.jaime, ids.tyrion],
      parentIds: [], collapsed: false,
    },
    [ids.joanna]: {
      id: ids.joanna, name: 'Joanna Lannister', gender: 'female', generation: 1,
      deathYear: '273', title: 'Lady Lannister',
      bio: 'Wife of Tywin, died giving birth to Tyrion',
      spouseIds: [ids.tywin], childrenIds: [ids.cersei, ids.jaime, ids.tyrion],
      parentIds: [], collapsed: false,
    },
    [ids.cersei]: {
      id: ids.cersei, name: 'Cersei Lannister', gender: 'female', generation: 2,
      birthYear: 266, deathYear: '305', title: 'Queen Regent',
      bio: 'Twin sister of Jaime, Queen of the Seven Kingdoms',
      spouseIds: [], childrenIds: [ids.joffrey, ids.myrcella, ids.tommen],
      parentIds: [ids.tywin, ids.joanna], collapsed: false,
    },
    [ids.jaime]: {
      id: ids.jaime, name: 'Jaime Lannister', gender: 'male', generation: 2,
      birthYear: 266, deathYear: '305', title: 'Kingslayer',
      bio: 'Lord Commander of the Kingsguard, twin brother of Cersei',
      spouseIds: [], childrenIds: [ids.joffrey, ids.myrcella, ids.tommen],
      parentIds: [ids.tywin, ids.joanna], collapsed: false,
    },
    [ids.tyrion]: {
      id: ids.tyrion, name: 'Tyrion Lannister', gender: 'male', generation: 2,
      birthYear: 273, title: 'Hand of the Queen',
      bio: 'The Imp, witty and clever, served as Hand to Daenerys',
      spouseIds: [ids.sansa], childrenIds: [],
      parentIds: [ids.tywin, ids.joanna], collapsed: false,
    },
    [ids.joffrey]: {
      id: ids.joffrey, name: 'Joffrey Baratheon', gender: 'male', generation: 3,
      birthYear: 286, deathYear: '300', title: 'King',
      bio: 'Cruel boy king, son of Cersei and Jaime',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.cersei, ids.jaime], collapsed: false,
    },
    [ids.myrcella]: {
      id: ids.myrcella, name: 'Myrcella Baratheon', gender: 'female', generation: 3,
      birthYear: 288, deathYear: '303', title: 'Princess',
      bio: 'Daughter of Cersei and Jaime, gentle and kind',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.cersei, ids.jaime], collapsed: false,
    },
    [ids.tommen]: {
      id: ids.tommen, name: 'Tommen Baratheon', gender: 'male', generation: 3,
      birthYear: 291, deathYear: '303', title: 'King',
      bio: 'Youngest son of Cersei and Jaime, became king after Joffrey',
      spouseIds: [], childrenIds: [],
      parentIds: [ids.cersei, ids.jaime], collapsed: false,
    },
  };

  return {
    persons,
    siblingOrder: {},
    spouseOrder: {},
    selectedPersonId: ids.eddard,
    currentTree: null,
    treeNames: {},
  };
}

export interface SampleTree {
  key: string;
  label: string;
  treeName: string;
  anchorPersonName: string;
  description: string;
  personCount: number;
  getData: () => LocalData;
}

const ZH_SAMPLES: SampleTree[] = [
  {
    key: 'han-dynasty',
    label: '刘邦——汉朝皇室',
    treeName: '汉朝皇室',
    anchorPersonName: '刘邦',
    description: '西汉皇帝世系，从刘太公到汉成帝',
    personCount: 24,
    getData: createHanDynasty,
  },
  {
    key: 'sheng-family',
    label: '盛明兰——宥阳盛氏',
    treeName: '宥阳盛氏',
    anchorPersonName: '盛明兰',
    description: '《知否知否应是绿肥红瘦》盛家族谱',
    personCount: 23,
    getData: createShengFamily,
  },
];

const EN_SAMPLES: SampleTree[] = [
  {
    key: 'game-of-thrones',
    label: 'Eddard Stark — House Stark & Targaryen',
    treeName: 'Game of Thrones',
    anchorPersonName: 'Eddard Stark',
    description: 'Key families from A Song of Ice and Fire',
    personCount: 25,
    getData: createGameOfThrones,
  },
];

export function getSampleTrees(): SampleTree[] {
  return isEnglish() ? EN_SAMPLES : ZH_SAMPLES;
}

export const SAMPLE_TREES: SampleTree[] = ZH_SAMPLES;
