<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiClient, ApiClientError, type AnalyticsSummary } from '@/api/client'
import { useClubsStore } from '@/stores/clubs'
import BusinessMetrics from '@/components/admin/BusinessMetrics.vue'
import AiMetrics from '@/components/admin/AiMetrics.vue'
import PageIntro from '@/components/layout/PageIntro.vue'
import StatusPill from '@/components/ui/StatusPill.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { Club } from '@/types'

const store = useClubsStore()
const analytics = ref<AnalyticsSummary | null>(null)
const authenticated = ref(false)
const showLogin = ref(false)
const showForm = ref(false)
const password = ref('')
const editingId = ref<number | null>(null)
const saving = ref(false)
const loggingIn = ref(false)
const loggingOut = ref(false)
const refreshing = ref(false)
const generating = ref<'description' | 'tags' | null>(null)
const deletingId = ref<number | null>(null)
const pageError = ref('')
const loginError = ref('')
const formError = ref('')
const fieldErrors = reactive({ name: '', description: '' })
const activeDialog = ref<HTMLFormElement | null>(null)
const dialogOpen = computed(() => showLogin.value || showForm.value)
const formBusy = computed(() => saving.value || generating.value !== null)
// The store converts API tags into arrays; its legacy annotation still uses API Club.
const clubs = computed(() => store.clubs as unknown as Club[])
let returnFocus: HTMLElement | null = null
let previousOverflow: string | null = null

const blank = (): Omit<Club, 'id'> => ({
  name:'',category:'技术',tags:[],description:'',requirements:'零基础可加入',memberCount:0,contact:'待补充',
  activityTime:'周末',weeklyHours:2,campus:'全校区',fee:0,skillRequirement:'beginner',isRecruiting:true,
})
const form = reactive<Omit<Club, 'id'>>(blank())
const tagsText = ref('')

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  pageError.value = ''
  try {
    const [summary] = await Promise.all([apiClient.analytics.summary(), store.fetchClubs()])
    analytics.value = summary
  } catch (error) { pageError.value = error instanceof Error ? error.message : '加载失败，请重试' }
  finally { refreshing.value = false }
}

onMounted(async () => {
  try { authenticated.value = (await apiClient.auth.status()).authenticated } catch { authenticated.value = false }
  await refresh()
})

watch([showLogin, showForm], async () => {
  if (dialogOpen.value) {
    if (previousOverflow === null) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
    await nextTick()
    activeDialog.value?.querySelector<HTMLInputElement>(showLogin.value ? '#admin-password' : '#club-name')?.focus()
  } else {
    restoreScroll()
    await nextTick()
    returnFocus?.focus()
  }
})
watch(formBusy, async (busy) => {
  await nextTick()
  if (!showForm.value || showLogin.value) return
  if (busy) activeDialog.value?.focus()
  else activeDialog.value?.querySelector<HTMLInputElement>('#club-name')?.focus()
})
function restoreScroll() {
  if (previousOverflow !== null) { document.body.style.overflow = previousOverflow; previousOverflow = null }
}
onUnmounted(restoreScroll)
function rememberFocus() { returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null }
function openLogin() { if (!dialogOpen.value) rememberFocus(); loginError.value = ''; showLogin.value = true }
function closeLogin() { if (!loggingIn.value) showLogin.value = false }
function closeForm() { if (!formBusy.value) showForm.value = false }
function dialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); showLogin.value ? closeLogin() : closeForm(); return }
  if (event.key !== 'Tab') return
  if (showForm.value && !showLogin.value && formBusy.value) { event.preventDefault(); activeDialog.value?.focus(); return }
  const controls = activeDialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')
  if (!controls?.length) return
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}

function requireLogin(error: unknown) {
  if (error instanceof ApiClientError && error.status === 401) {
    authenticated.value = false
    openLogin()
    loginError.value = '管理会话已过期，请重新登录。未保存内容已保留。'
    return true
  }
  return false
}

async function login() {
  if (loggingIn.value) return
  if (!password.value) { loginError.value = '请输入管理密码'; return }
  loggingIn.value = true
  loginError.value = ''
  try {
    authenticated.value = (await apiClient.auth.login(password.value)).authenticated
    if (!authenticated.value) { loginError.value = '登录未成功，请检查密码后重试'; return }
    showLogin.value = false
    password.value = ''
    ElMessage.success('管理登录成功')
  } catch (error) { loginError.value = error instanceof Error ? error.message : '登录失败，请重试' }
  finally { loggingIn.value = false }
}

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try { await apiClient.auth.logout(); authenticated.value = false; password.value = '' }
  catch (error) { pageError.value = error instanceof Error ? error.message : '退出失败，请重试' }
  finally { loggingOut.value = false }
}
function resetFormErrors() { formError.value = ''; fieldErrors.name = ''; fieldErrors.description = '' }
function openCreate() { rememberFocus(); resetFormErrors(); editingId.value=null; Object.assign(form,blank()); tagsText.value=''; showForm.value=true }
function openEdit(club: Club) { rememberFocus(); resetFormErrors(); editingId.value=club.id; Object.assign(form,club); tagsText.value=club.tags.join('、'); showForm.value=true }

async function save() {
  if (formBusy.value) return
  resetFormErrors()
  fieldErrors.name = form.name.trim() ? '' : '请输入社团名称'
  fieldErrors.description = form.description.trim() ? '' : '请输入社团描述，也可以使用 AI 生成草稿'
  if (fieldErrors.name || fieldErrors.description) {
    await nextTick()
    activeDialog.value?.querySelector<HTMLElement>(fieldErrors.name ? '#club-name' : '#club-description')?.focus()
    return
  }
  saving.value=true
  form.tags = tagsText.value.split(/[、,，]/).map(v=>v.trim()).filter(Boolean)
  try {
    if (editingId.value) await store.updateClub(editingId.value, { ...form } as unknown as Parameters<typeof store.updateClub>[1])
    else await store.addClub({ ...form } as unknown as Parameters<typeof store.addClub>[0])
    showForm.value=false
    await refresh()
    ElMessage.success(editingId.value ? '社团已更新' : '社团已创建')
  } catch (error) { formError.value = error instanceof Error ? error.message : '保存失败，请重试'; requireLogin(error) }
  finally { saving.value=false }
}

async function remove(club: Club) {
  if (deletingId.value !== null) return
  deletingId.value = club.id
  try {
    await ElMessageBox.confirm(`删除“${club.name}”后无法恢复。`, '删除社团', { type:'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
    await store.deleteClub(club.id); await refresh(); ElMessage.success('社团已删除')
  } catch (error) { if (error !== 'cancel' && error !== 'close' && !requireLogin(error)) ElMessage.error(error instanceof Error ? error.message : '删除失败') }
  finally { deletingId.value = null }
}

async function generateDescription() {
  await generate('description')
}
async function suggestTags() {
  await generate('tags')
}
async function generate(kind: 'description' | 'tags') {
  if (formBusy.value) return
  if (!form.name.trim()) { fieldErrors.name = '先填写社团名称，再使用 AI 辅助'; return }
  fieldErrors.name = ''
  formError.value = ''
  generating.value = kind
  try {
    if (kind === 'description') {
      form.description = (await apiClient.ai.generateDescription(form.name, form.category)).description
      fieldErrors.description = ''
    } else tagsText.value = (await apiClient.ai.suggestTags(form.name, form.category, form.description)).join('、')
  } catch (error) { formError.value = error instanceof Error ? error.message : '生成失败，已保留当前内容'; requireLogin(error) }
  finally { generating.value = null }
}
</script>

<template>
  <main class="admin-page">
    <div class="content-app" :inert="dialogOpen">
      <PageIntro>
        运营看板
        <template #description><p>查看推荐与意向转化，维护同学做决定所需的社团资料。</p></template>
        <template #aside><button type="button" class="button-primary" @click="openCreate">新增社团</button></template>
      </PageIntro>
      <div class="toolbar">
        <StatusPill :tone="authenticated ? 'success' : 'neutral'" :label="authenticated ? '管理会话已登录' : '访客 · 可查看数据'" />
        <div class="actions">
          <button type="button" class="quiet" :disabled="refreshing" @click="refresh">{{ refreshing ? '刷新中…' : '刷新数据' }}</button>
          <button v-if="authenticated" type="button" class="quiet" :disabled="loggingOut" @click="logout">{{ loggingOut ? '退出中…' : '退出登录' }}</button>
          <button v-else type="button" class="quiet" @click="openLogin">管理登录</button>
        </div>
      </div>
      <p v-if="pageError" class="error-notice" role="alert">{{ pageError }}。可点击刷新数据重试。</p>
      <div v-if="analytics" class="dashboard" :aria-busy="refreshing"><BusinessMetrics :data="analytics.business" /><AiMetrics :data="analytics.ai" /></div>
      <p v-else-if="refreshing" class="loading-notice" role="status">正在读取业务与 AI 指标…</p>
      <EmptyState v-else title="指标暂不可用" description="请检查服务连接，再刷新数据。已有社团资料仍可查看。" />
      <section class="club-table" aria-labelledby="clubs-title">
        <header><div><h2 id="clubs-title">社团资料</h2><p>{{ clubs.length }} 个社团 · 编辑资料前请登录管理会话</p></div><span class="table-hint">小屏幕可横向滚动查看完整资料</span></header>
        <div v-if="clubs.length" class="table-wrap" tabindex="0" role="region" aria-label="社团运营列表，可横向滚动">
          <table>
            <caption class="sr-only">社团运营列表</caption>
            <thead><tr><th scope="col">社团</th><th scope="col">招募状态</th><th scope="col">活动安排</th><th scope="col">时间与费用</th><th scope="col">操作</th></tr></thead>
            <tbody><tr v-for="club in clubs" :key="club.id">
              <th scope="row"><b>{{ club.name }}</b><small>{{ club.category }} · {{ club.campus }}</small></th>
              <td><StatusPill :tone="club.isRecruiting ? 'success' : 'neutral'" :label="club.isRecruiting ? '招募中' : '已暂停招募'" /></td>
              <td>{{ club.activityTime }}</td><td>{{ club.weeklyHours }} 小时/周<small>{{ club.fee }} 元</small></td>
              <td><div class="row-actions"><button type="button" class="link" :aria-label="`编辑${club.name}`" @click="openEdit(club)">编辑</button><button type="button" class="link danger" :aria-label="`删除${club.name}`" :disabled="deletingId !== null" @click="remove(club)">{{ deletingId === club.id ? '处理中…' : '删除' }}</button></div></td>
            </tr></tbody>
          </table>
        </div>
        <p v-else-if="store.loading" role="status" class="loading-notice">正在读取社团资料…</p>
        <EmptyState v-else title="暂无社团资料" description="点击页面上方的新增社团，完善第一份招募资料。" />
      </section>
    </div>

    <div v-if="showLogin" class="overlay" @click.self="closeLogin">
      <form ref="activeDialog" class="dialog compact" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="login-title" aria-describedby="login-description" :aria-busy="loggingIn" @submit.prevent="login" @keydown="dialogKeydown">
        <header><h2 id="login-title">管理登录</h2><p id="login-description">登录后可维护社团资料。管理会话有效期最长 8 小时。</p></header>
        <div class="login-fields">
          <label for="admin-password">管理密码</label>
          <input id="admin-password" v-model="password" type="password" autocomplete="current-password" :readonly="loggingIn" :aria-invalid="!!loginError" :aria-describedby="loginError ? 'login-error' : undefined" />
          <p v-if="loginError" id="login-error" class="field-error" role="alert">{{ loginError }}</p>
        </div>
        <footer><button type="button" class="quiet" :disabled="loggingIn" @click="closeLogin">取消</button><button type="submit" class="button-primary" :disabled="loggingIn">{{ loggingIn ? '登录中…' : '登录' }}</button></footer>
      </form>
    </div>
    <div v-else-if="showForm" class="overlay" @click.self="closeForm">
      <form ref="activeDialog" class="dialog" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="edit-title" aria-describedby="edit-description" :aria-busy="formBusy" @submit.prevent="save" @keydown="dialogKeydown">
        <header class="dialog-heading"><div><h2 id="edit-title">{{ editingId ? '编辑社团' : '新增社团' }}</h2><p id="edit-description">完善活动与招募信息。名称和描述为必填项。</p></div><button type="button" class="quiet" aria-label="关闭社团编辑" :disabled="formBusy" @click="closeForm">关闭</button></header>
        <div class="dialog-body">
          <fieldset class="form-grid" :disabled="formBusy">
            <legend class="sr-only">社团资料</legend>
            <label for="club-name">名称 <span class="required">必填</span><input id="club-name" v-model="form.name" aria-required="true" :aria-invalid="!!fieldErrors.name" :aria-describedby="fieldErrors.name ? 'name-error' : undefined" /><span v-if="fieldErrors.name" id="name-error" class="field-error">{{ fieldErrors.name }}</span></label>
            <label for="club-category">分类<select id="club-category" v-model="form.category"><option>技术</option><option>体育</option><option>艺术</option><option>学术</option><option>文化</option></select></label>
            <label for="club-description" class="wide">描述 <span class="required">必填</span><textarea id="club-description" v-model="form.description" rows="4" aria-required="true" :aria-invalid="!!fieldErrors.description" :aria-describedby="fieldErrors.description ? 'description-error' : undefined" /><span v-if="fieldErrors.description" id="description-error" class="field-error">{{ fieldErrors.description }}</span></label>
            <label for="club-tags" class="wide">标签<input id="club-tags" v-model="tagsText" placeholder="编程、竞赛" aria-describedby="tags-help" /><span id="tags-help" class="field-help">用顿号或逗号分隔；AI 建议可在保存前修改。</span></label>
            <label for="club-time">活动时间<input id="club-time" v-model="form.activityTime" /></label>
            <label for="club-campus">校区<input id="club-campus" v-model="form.campus" /></label>
            <label for="club-hours">每周投入（小时）<input id="club-hours" v-model.number="form.weeklyHours" type="number" min="0" /></label>
            <label for="club-fee">费用（元）<input id="club-fee" v-model.number="form.fee" type="number" min="0" /></label>
            <label for="club-skill">技能门槛<select id="club-skill" v-model="form.skillRequirement"><option value="beginner">零基础</option><option value="intermediate">有基础</option><option value="advanced">熟练</option><option value="expert">专家</option></select></label>
            <label for="club-recruiting" class="check"><input id="club-recruiting" v-model="form.isRecruiting" type="checkbox" /> 正在招募新成员</label>
            <label for="club-requirements" class="wide">入社要求<input id="club-requirements" v-model="form.requirements" /></label>
            <label for="club-members">成员数<input id="club-members" v-model.number="form.memberCount" type="number" min="0" /></label>
            <label for="club-contact">联系方式<input id="club-contact" v-model="form.contact" /></label>
          </fieldset>
          <p v-if="formError" class="error-notice" role="alert">{{ formError }}</p>
        </div>
        <footer><div class="actions"><button type="button" class="quiet" :disabled="formBusy" @click="generateDescription">{{ generating === 'description' ? '生成描述中…' : 'AI 生成描述' }}</button><button type="button" class="quiet" :disabled="formBusy" @click="suggestTags">{{ generating === 'tags' ? '推荐标签中…' : 'AI 推荐标签' }}</button></div><button type="submit" class="button-primary" :disabled="formBusy">{{ saving ? '保存中…' : '保存' }}</button></footer>
      </form>
    </div>
  </main>
</template>

<style scoped>
.admin-page { padding-bottom: 64px; color: var(--text-ink); }
.toolbar, .actions, .club-table > header, .dialog-heading, .dialog > footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.toolbar { padding-bottom: 20px; flex-wrap: wrap; }
.actions { justify-content: flex-start; flex-wrap: wrap; }
.quiet, .link { min-height: 44px; min-width: 44px; padding: 10px 12px; border: 1px solid var(--border-moss); border-radius: var(--radius-control); color: var(--ink-forest); background: var(--surface); font-size: 14px; font-weight: 650; cursor: pointer; }
.quiet:hover, .link:hover { background: var(--field-paper); }
button:disabled { opacity: .55; cursor: not-allowed; }
.dashboard { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); gap: 20px; margin-bottom: 28px; }
.club-table { min-width: 0; margin-top: 28px; padding: 24px; border: 1px solid var(--border-moss); border-radius: var(--radius-panel); background: var(--surface); }
.club-table h2, .dialog h2 { margin: 0; font-size: 22px; font-weight: 750; }
.club-table header p, .dialog header p { margin: 6px 0 0; color: var(--text-muted); font-size: 14px; line-height: 1.6; }
.table-hint { display: none; color: var(--text-muted); font-size: 14px; }
.table-wrap { margin-top: 20px; overflow: auto; max-height: 580px; }
table { width: 100%; min-width: 760px; border-collapse: separate; border-spacing: 0; text-align: left; }
th, td { padding: 14px 12px; border-bottom: 1px solid var(--border-moss); font-size: 14px; }
thead th { position: sticky; top: 0; z-index: 2; background: var(--field-paper); color: var(--text-muted); font-weight: 650; white-space: nowrap; }
tbody th { position: sticky; left: 0; z-index: 1; background: var(--surface); min-width: 170px; max-width: 240px; overflow-wrap: anywhere; font-weight: 600; }
thead th:first-child { left: 0; z-index: 3; }
td small, th small { display: block; margin-top: 4px; color: var(--text-muted); font-weight: 400; }
.row-actions { display: flex; gap: 6px; white-space: nowrap; }
.link { border-color: transparent; padding-inline: 8px; }
.danger { color: var(--danger); }
.overlay { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgb(20 37 34 / 58%); }
.dialog { display: flex; flex-direction: column; width: min(760px, 100%); max-height: calc(100dvh - 40px); min-height: 0; border: 1px solid var(--border-moss); border-radius: var(--radius-panel); background: var(--surface); box-shadow: var(--shadow-lg); }
.dialog.compact { width: min(440px, 100%); overflow: auto; }
.dialog > header { padding: 24px; border-bottom: 1px solid var(--border-moss); }
.dialog-heading { align-items: flex-start; }
.dialog-heading > button { flex-shrink: 0; }
.dialog-body { overflow-y: auto; padding: 24px; min-height: 0; }
.dialog > footer { flex-shrink: 0; padding: 18px 24px; border-top: 1px solid var(--border-moss); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin: 0; padding: 0; border: 0; min-width: 0; }
.form-grid label, .login-fields { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 650; }
.form-grid .wide { grid-column: 1 / -1; }
.required { color: var(--text-muted); font-size: 14px; font-weight: 400; }
.form-grid .check { flex-direction: row; align-items: center; min-height: 44px; align-self: end; }
.check input { width: 20px !important; height: 20px; accent-color: var(--campus-green); }
.dialog input, .dialog textarea, .dialog select { width: 100%; min-width: 0; padding: 10px 12px; border: 1px solid var(--border-moss); border-radius: var(--radius-control); color: var(--text-ink); background: var(--surface); font: inherit; font-weight: 400; }
.dialog textarea { resize: vertical; min-height: 100px; }
.dialog [aria-invalid="true"] { border-color: var(--danger); }
.login-fields { padding: 24px; }
.field-help { color: var(--text-muted); font-weight: 400; }
.field-error { color: var(--danger); font-size: 14px; font-weight: 500; margin: 0; }
.error-notice { padding: 14px 16px; border: 1px solid var(--danger); border-radius: var(--radius-control); color: var(--danger); background: var(--surface); font-size: 14px; overflow-wrap: anywhere; }
.loading-notice { padding: 24px 0; color: var(--text-muted); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
@media (max-width: 1024px) { .dashboard { grid-template-columns: 1fr; } .table-hint { display: block; } .club-table > header { align-items: flex-start; flex-direction: column; } }
@media (max-width: 600px) {
  .club-table { padding: 18px; } .toolbar { align-items: flex-start; flex-direction: column; }
  .overlay { padding: 12px; } .dialog { max-height: calc(100dvh - 24px); }
  .dialog > header, .dialog-body, .login-fields { padding: 18px; }
  .dialog > footer { padding: 14px 18px; flex-wrap: wrap; }
  .dialog > footer > .actions { width: 100%; gap: 8px; }
  .dialog > footer > .button-primary { margin-left: auto; }
  .form-grid { grid-template-columns: 1fr; } .form-grid .wide { grid-column: auto; }
}
</style>
