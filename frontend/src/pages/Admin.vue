<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiClient, ApiClientError, type AnalyticsSummary } from '@/api/client'
import { useClubsStore } from '@/stores/clubs'
import BusinessMetrics from '@/components/admin/BusinessMetrics.vue'
import AiMetrics from '@/components/admin/AiMetrics.vue'
import type { Club } from '@/types'

const store = useClubsStore()
const analytics = ref<AnalyticsSummary | null>(null)
const authenticated = ref(false)
const showLogin = ref(false)
const showForm = ref(false)
const password = ref('')
const editingId = ref<number | null>(null)
const saving = ref(false)

const blank = (): Omit<Club, 'id'> => ({
  name:'',category:'技术',tags:[],description:'',requirements:'零基础可加入',memberCount:0,contact:'待补充',
  activityTime:'周末',weeklyHours:2,campus:'全校区',fee:0,skillRequirement:'beginner',isRecruiting:true,
})
const form = reactive<Omit<Club, 'id'>>(blank())
const tagsText = ref('')

async function refresh() {
  const [summary] = await Promise.all([apiClient.analytics.summary(), store.fetchClubs()])
  analytics.value = summary
}

onMounted(async () => {
  try { authenticated.value = (await apiClient.auth.status()).authenticated } catch { authenticated.value = false }
  try { await refresh() } catch (error) { ElMessage.error(error instanceof Error ? error.message : '加载失败') }
})

function requireLogin(error: unknown) {
  if (error instanceof ApiClientError && error.status === 401) { authenticated.value = false; showLogin.value = true; return true }
  return false
}

async function login() {
  try { authenticated.value = (await apiClient.auth.login(password.value)).authenticated; showLogin.value=false; password.value=''; ElMessage.success('管理登录成功') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '登录失败') }
}

function openCreate() { editingId.value=null; Object.assign(form,blank()); tagsText.value=''; showForm.value=true }
function openEdit(club: Club) { editingId.value=club.id; Object.assign(form,club); tagsText.value=club.tags.join('、'); showForm.value=true }

async function save() {
  if (!form.name.trim() || !form.description.trim()) return ElMessage.warning('名称和描述不能为空')
  saving.value=true
  form.tags = tagsText.value.split(/[、,，]/).map(v=>v.trim()).filter(Boolean)
  try {
    if (editingId.value) await store.updateClub(editingId.value, { ...form })
    else await store.addClub({ ...form })
    showForm.value=false
    await refresh()
    ElMessage.success(editingId.value ? '社团已更新' : '社团已创建')
  } catch (error) { if (!requireLogin(error)) ElMessage.error(error instanceof Error ? error.message : '保存失败') }
  finally { saving.value=false }
}

async function remove(club: Club) {
  try {
    await ElMessageBox.confirm(`删除“${club.name}”？`, '确认操作', { type:'warning' })
    await store.deleteClub(club.id); await refresh(); ElMessage.success('社团已删除')
  } catch (error) { if (error !== 'cancel' && error !== 'close' && !requireLogin(error)) ElMessage.error(error instanceof Error ? error.message : '删除失败') }
}

async function generateDescription() {
  if (!form.name) return ElMessage.warning('先填写社团名称')
  try { form.description=(await apiClient.ai.generateDescription(form.name,form.category)).description }
  catch (error) { if (!requireLogin(error)) ElMessage.error(error instanceof Error ? error.message : '生成失败') }
}
</script>

<template>
  <main class="admin-page">
    <header class="page-head"><div><p>运营驾驶舱</p><h1>从推荐到意向，用指标验证方案价值</h1></div><div class="actions"><button class="quiet" @click="showLogin=true">{{ authenticated ? '已登录' : '管理登录' }}</button><button @click="openCreate">新增社团</button></div></header>
    <div v-if="analytics" class="dashboard"><BusinessMetrics :data="analytics.business"/><AiMetrics :data="analytics.ai"/></div>
    <section class="club-table"><header><h2>社团数据</h2><span>所有写操作均由后端校验管理会话</span></header><div class="table-wrap"><table><thead><tr><th>社团</th><th>招新</th><th>安排</th><th>投入</th><th>操作</th></tr></thead><tbody><tr v-for="club in store.clubs" :key="club.id"><td><b>{{ club.name }}</b><small>{{ club.category }} · {{ club.campus }}</small></td><td><span :class="club.isRecruiting?'open':'closed'">{{ club.isRecruiting?'进行中':'已暂停' }}</span></td><td>{{ club.activityTime }}</td><td>{{ club.weeklyHours }} 小时/周 · {{ club.fee }} 元</td><td><button class="link" @click="openEdit(club)">编辑</button><button class="link danger" @click="remove(club)">删除</button></td></tr></tbody></table></div></section>

    <div v-if="showLogin" class="overlay" @click.self="showLogin=false"><form class="dialog compact" @submit.prevent="login"><h2>管理登录</h2><p>演示用单管理员会话，有效期最长 8 小时。</p><input v-model="password" type="password" autocomplete="current-password" placeholder="管理密码"/><div><button type="button" class="quiet" @click="showLogin=false">取消</button><button>登录</button></div></form></div>
    <div v-if="showForm" class="overlay" @click.self="showForm=false"><form class="dialog" @submit.prevent="save"><header><h2>{{ editingId?'编辑社团':'新增社团' }}</h2><button type="button" class="quiet" @click="showForm=false">关闭</button></header><div class="form-grid"><label>名称<input v-model="form.name"/></label><label>分类<select v-model="form.category"><option>技术</option><option>体育</option><option>艺术</option><option>学术</option><option>文化</option></select></label><label class="wide">描述<textarea v-model="form.description" rows="4"/></label><label class="wide">标签<input v-model="tagsText" placeholder="编程、竞赛"/></label><label>活动时间<input v-model="form.activityTime"/></label><label>校区<input v-model="form.campus"/></label><label>每周小时<input v-model.number="form.weeklyHours" type="number" min="0"/></label><label>费用<input v-model.number="form.fee" type="number" min="0"/></label><label>技能门槛<select v-model="form.skillRequirement"><option value="beginner">零基础</option><option value="intermediate">有基础</option><option value="advanced">熟练</option><option value="expert">专家</option></select></label><label class="check"><input v-model="form.isRecruiting" type="checkbox"/> 正在招新</label><label class="wide">入社要求<input v-model="form.requirements"/></label><label>成员数<input v-model.number="form.memberCount" type="number" min="0"/></label><label>联系方式<input v-model="form.contact"/></label></div><footer><button type="button" class="quiet" @click="generateDescription">AI 生成描述</button><button :disabled="saving">{{ saving?'保存中…':'保存' }}</button></footer></form></div>
  </main>
</template>

<style scoped>
.admin-page{min-height:100vh;padding:48px max(24px,calc((100vw - 1180px)/2)) 90px;background:#f5f7f7;color:#17324d}.page-head{display:flex;justify-content:space-between;gap:30px;align-items:end}.page-head p{margin:0;color:#d95252;font-weight:750}.page-head h1{margin:8px 0 0;max-width:760px;font-size:clamp(30px,4vw,48px);line-height:1.1}.actions{display:flex;gap:10px}button{padding:10px 15px;border:0;border-radius:8px;background:#ff6b6b;color:#fff;font-weight:700;cursor:pointer}.quiet{background:#e8eef1;color:#29485c}.dashboard{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:34px 0}.club-table{background:#fff;border:1px solid #dbe4e9;border-radius:16px;padding:24px}.club-table>header{display:flex;justify-content:space-between;align-items:baseline}.club-table h2{margin:0}.club-table header span{font-size:12px;color:#71838e}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;margin-top:18px;text-align:left}th,td{padding:14px 10px;border-top:1px solid #e5ebee;font-size:14px}td b,td small{display:block}td small{margin-top:4px;color:#71838e}.open,.closed{font-size:12px;padding:4px 7px;border-radius:6px}.open{background:#e1f4ea;color:#216747}.closed{background:#edf0f2;color:#657681}.link{padding:5px;background:transparent;color:#2e6b8c}.danger{color:#c24b4b}.overlay{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:rgba(15,36,50,.58)}.dialog{width:min(760px,100%);max-height:90vh;overflow:auto;padding:26px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.22)}.dialog.compact{width:min(420px,100%)}.dialog>header,.dialog>footer,.dialog.compact>div{display:flex;justify-content:space-between;gap:12px;align-items:center}.dialog h2{margin:0}.dialog p{color:#687b87}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:22px 0}.form-grid label{display:grid;gap:6px;font-size:13px;font-weight:650}.form-grid .wide{grid-column:1/-1}.check{display:flex!important;align-items:center}.check input{width:auto}.dialog input,.dialog textarea,.dialog select{box-sizing:border-box;width:100%;padding:10px;border:1px solid #cad5dc;border-radius:8px;font:inherit}@media(max-width:800px){.page-head,.club-table>header{align-items:flex-start;flex-direction:column}.dashboard{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.form-grid .wide{grid-column:auto}}
</style>
