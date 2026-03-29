import { defineStore } from 'pinia'
import type { Club, ClubCategory } from '@/types'

// Sample clubs data
const sampleClubs: Club[] = [
  {
    id: '1',
    name: '编程俱乐部',
    category: '技术',
    tags: ['编程', '开发', 'Web', 'Python', 'JavaScript'],
    description:
      '编程俱乐部是学校最大的技术社团之一，汇聚了全校热爱编程的同学。我们每周举办技术分享会，涵盖前端、后端、移动端等多个方向。社团成员来自不同专业，从大一新生到大四学长都有，大家一起学习、一起进步。我们还组织Hackathon，让同学们在实践中提升技能。',
    requirements: '对编程有浓厚兴趣，愿意投入时间学习。无需基础，我们从零开始教学。',
    memberCount: 128,
    contact: '编程社团群：123456789 | 负责人：张三 (微信：zhangsan)',
  },
  {
    id: '2',
    name: '人工智能社团',
    category: '技术',
    tags: ['AI', '机器学习', '深度学习', 'Python', '数据科学'],
    description:
      '人工智能社团专注于机器学习和深度学习技术的学习与应用。我们定期开展算法讲座、项目实践和论文研讨。社团成员参与了多个校级和省级AI竞赛并取得优异成绩获奖。无论你是AI小白还是算法高手，都能在这里找到志同道合的伙伴。',
    requirements: '对人工智能感兴趣，具备一定的数学基础。Python经验优先。',
    memberCount: 86,
    contact: 'AI社团群：987654321 | 负责人：李四 (邮箱：lisi@example.com)',
  },
  {
    id: '3',
    name: '篮球协会',
    category: '体育',
    tags: ['篮球', '运动', '团队', '竞技'],
    description: '篮球协会是校园内最受欢迎的体育社团之一。我们拥有多支不同水平的队伍，从娱乐队到校队一应俱全。每周固定训练，每月组织友谊赛。无论你是篮球高手还是刚刚入门，都能在这里找到适合的队伍和位置。',
    requirements: '热爱篮球，能够按时参加训练。有无基础均可。',
    memberCount: 156,
    contact: '篮球协会群：456789123 | 负责人：王五 (手机：13800138000)',
  },
  {
    id: '4',
    name: '摄影协会',
    category: '艺术',
    tags: ['摄影', '艺术', '创作', '视觉'],
    description: '摄影协会汇聚了校内所有摄影爱好者。我们定期举办外拍活动、摄影比赛和技术讲座。社团拥有摄影工作室，提供专业设备供成员使用。从风光摄影到人像摄影，从胶片到数码，我们探讨各种摄影技艺，用镜头记录生活的美好瞬间。',
    requirements: '对摄影有兴趣，有无相机均可。愿意学习和分享。',
    memberCount: 92,
    contact: '摄影协会群：789123456 | 负责人：赵六 (微信：zhaoliu)',
  },
  {
    id: '5',
    name: '辩论社',
    category: '学术',
    tags: ['辩论', '口才', '逻辑', '思辨'],
    description: '辩论社致力于培养同学们的思辨能力和演讲口才。我们每周进行辩论训练，每月举办辩论赛。社团在校级辩论赛中连续多年夺冠，并与多所高校建立交流关系。加入辩论社，不仅能提升逻辑思维能力，还能结识来自不同专业的思维活跃的伙伴。',
    requirements: '有较强的表达欲和思考能力。愿意投入时间准备比赛。',
    memberCount: 68,
    contact: '辩论社群：234567891 | 负责人：钱七 (邮箱：qianqi@example.com)',
  },
  {
    id: '6',
    name: '吉他社',
    category: '艺术',
    tags: ['音乐', '吉他', '弹唱', '乐队'],
    description: '吉他社是校园音乐的发源地。无论你是民谣爱好者还是摇滚信徒，都能在这里找到志同道合的伙伴。我们定期举办音乐会和路演，还组建了多支校园乐队。社团提供吉他教学，从零基础到进阶技巧全覆盖。来和我们一起用音乐点燃青春！',
    requirements: '热爱音乐，对吉他感兴趣。有无基础均可。',
    memberCount: 110,
    contact: '吉他社群：345678912 | 负责人：孙八 (微信：sunba)',
  },
  {
    id: '7',
    name: '足球协会',
    category: '体育',
    tags: ['足球', '运动', '团队', '竞技'],
    description: '足球协会拥有完善的训练体系和多支队伍。我们每周进行两次训练，周末组织友谊赛或观看足球比赛直播。社团还参与校际联赛，与周边高校球队交流。无论你是门将、后卫还是前锋，都能在这里找到发挥的空间。',
    requirements: '热爱足球，身体素质良好。能够按时参加训练和比赛。',
    memberCount: 134,
    contact: '足球协会群：567891234 | 负责人：周九 (手机：13900139000)',
  },
  {
    id: '8',
    name: '英语角',
    category: '学术',
    tags: ['英语', '口语', '交流', '语言'],
    description: '英语角为同学们提供轻松愉快的英语练习环境。我们每周举办主题讨论，涵盖文化、科技、生活等各个方面。社团邀请外教和高水平学长学姐参与，帮助大家提升口语和听力。无论你的英语水平如何，只要敢开口，就能进步。',
    requirements: '想要提升英语水平，愿意开口表达。无需高英语基础。',
    memberCount: 145,
    contact: '英语角群：678912345 | 负责人：吴十 (邮箱：wushi@example.com)',
  },
  {
    id: '9',
    name: '舞蹈协会',
    category: '艺术',
    tags: ['舞蹈', '艺术', '表演', '健身'],
    description: '舞蹈协会包含街舞、民族舞、现代舞等多个舞种。我们有专业的舞蹈教室和经验丰富的指导老师。社团定期举办舞蹈汇演，还参与校内外各种演出活动。无论你是零基础的小白还是有一定基础的舞者，都能在这里找到适合自己的舞种和水平。',
    requirements: '热爱舞蹈，愿意投入时间练习。有无基础均可。',
    memberCount: 98,
    contact: '舞蹈协会群：891234567 | 负责人：郑十一 (微信：zhengshiyi)',
  },
  {
    id: '10',
    name: '网络安全社团',
    category: '技术',
    tags: ['网络安全', '黑客', 'CTF', '信息安全'],
    description: '网络安全社团专注于信息安全技术的学习和实践。我们定期举办CTF比赛、漏洞分析和安全讲座。社团成员多次在省级网络安全竞赛中获奖。我们倡导"白帽子"精神，学习安全技术是为了更好地保护系统安全。',
    requirements: '对网络安全感兴趣，有较强的逻辑思维能力。编程基础优先。',
    memberCount: 72,
    contact: '网络安全社团群：912345678 | 负责人：王十二 (邮箱：wangshier@example.com)',
  },
]

const categories: ClubCategory[] = [
  { id: 'tech', name: '技术', icon: '💻' },
  { id: 'sports', name: '体育', icon: '⚽' },
  { id: 'arts', name: '艺术', icon: '🎨' },
  { id: 'academic', name: '学术', icon: '📚' },
  { id: 'cultural', name: '文化', icon: '🌍' },
]

export const useClubsStore = defineStore('clubs', {
  state: () => ({
    clubs: sampleClubs as Club[],
    categories: categories,
    searchQuery: '',
    selectedCategory: '',
    selectedTags: [] as string[],
  }),

  getters: {
    filteredClubs: (state) => {
      let result = state.clubs

      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase()
        result = result.filter(
          (club) =>
            club.name.toLowerCase().includes(query) ||
            club.description.toLowerCase().includes(query) ||
            club.tags.some((tag) => tag.toLowerCase().includes(query)),
        )
      }

      if (state.selectedCategory) {
        result = result.filter((club) => club.category === state.selectedCategory)
      }

      if (state.selectedTags.length > 0) {
        result = result.filter((club) =>
          state.selectedTags.some((tag) => club.tags.includes(tag)),
        )
      }

      return result
    },

    allTags: (state) => {
      const tagSet = new Set<string>()
      state.clubs.forEach((club) => {
        club.tags.forEach((tag) => tagSet.add(tag))
      })
      return Array.from(tagSet).sort()
    },

    clubsByCategory: (state) => {
      const grouped: Record<string, Club[]> = {}
      state.clubs.forEach((club) => {
        if (!grouped[club.category]) {
          grouped[club.category] = []
        }
        grouped[club.category].push(club)
      })
      return grouped
    },

    getClubById: (state) => (id: string) => {
      return state.clubs.find((club) => club.id === id)
    },

    featuredClubs: (state) => {
      return state.clubs
        .filter((club) => {
          const count = typeof club.memberCount === 'number' ? club.memberCount : parseInt(club.memberCount as string) || 0
          return count > 100
        })
        .slice(0, 4)
    },
  },

  actions: {
    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    setSelectedCategory(category: string) {
      this.selectedCategory = category
    },

    setSelectedTags(tags: string[]) {
      this.selectedTags = tags
    },

    toggleTag(tag: string) {
      const index = this.selectedTags.indexOf(tag)
      if (index > -1) {
        this.selectedTags.splice(index, 1)
      } else {
        this.selectedTags.push(tag)
      }
    },

    clearFilters() {
      this.searchQuery = ''
      this.selectedCategory = ''
      this.selectedTags = []
    },

    addClub(club: Club) {
      this.clubs.push(club)
    },

    updateClub(id: string, updates: Partial<Club>) {
      const index = this.clubs.findIndex((club) => club.id === id)
      if (index > -1) {
        this.clubs[index] = { ...this.clubs[index], ...updates }
      }
    },

    deleteClub(id: string) {
      const index = this.clubs.findIndex((club) => club.id === id)
      if (index > -1) {
        this.clubs.splice(index, 1)
      }
    },
  },
})
