export type Language = 'en' | 'zh';

type LanguageStore = Pick<Storage, 'getItem' | 'setItem'>;
export const languageKey = 'overlap-language-v1';

export function readLanguage(store: Pick<LanguageStore, 'getItem'>, browserLanguage = 'en'): Language {
  try {
    const saved = store.getItem(languageKey);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch { /* Optional browser storage. */ }
  return browserLanguage.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function saveLanguage(store: Pick<LanguageStore, 'setItem'>, language: Language): void {
  try { store.setItem(languageKey, language); } catch { /* Optional browser storage. */ }
}

const exact: Record<string, string> = {
  'Skip to planner': '跳到规划器',
  'Overlap home': 'Overlap 首页',
  'Works in your browser': '仅在浏览器中运行',
  'Source code ↗': '源代码 ↗',
  'LESS BACK-AND-FORTH, MORE TIME TOGETHER': '少一点来回确认，多一点共同时间',
  'A good time.': '一个合适的时间。',
  'For everyone.': '适合每个人。',
  'Different cities. One shared moment.': '身处不同城市，共享同一刻。',
  'Find the hours that work for all of you.': '找到所有人都合适的时间。',
  'Shared plan not loaded': '未能载入共享计划',
  'Continue with this plan': '继续使用当前计划',
  '01 / YOUR PEOPLE': '01 / 参与者',
  'Around the same table.': '让大家坐到同一张时间表前。',
  'Add city': '添加城市',
  'Time zone planner': '时区规划器',
  'Try a setup': '试试预设',
  'Across the Atlantic': '跨大西洋',
  'Global team': '全球团队',
  'Long distance': '异地相伴',
  'My saved plans': '已保存的计划',
  'Planning date': '规划日期',
  'Duration': '时长',
  'Default days': '默认日期',
  'Every day': '每天',
  'Mon–Fri': '周一至周五',
  'Choose days per city below, or keep the default. Overnight hours belong to the day they start.': '可为每个城市选择日期，也可沿用默认设置。跨夜时段归属于开始的那一天。',
  '← Previous day': '← 前一天',
  'Previous planning day': '前一个规划日期',
  'Today': '今天',
  'Next day →': '后一天 →',
  'Next planning day': '后一个规划日期',
  'Planning date shortcuts': '规划日期快捷操作',
  'Date & slider follow': '日期与时间轴跟随',
  '· 24-hour day': '· 24 小时日',
  '· 23-hour day': '· 23 小时日',
  '· 25-hour day': '· 25 小时日',
  'Available': '可用时间',
  'BASE': '参考',
  '● Within hours': '● 在可用时间内',
  '○ Outside hours': '○ 不在可用时间内',
  'Make base city': '设为参考城市',
  '+ Add window': '+ 添加时段',
  'Equal times mean all day.': '起止时间相同表示全天可用。',
  'Windows combine; gaps stay unavailable.': '多个时段合并计算，间隔仍不可用。',
  'Up to 3 windows per city.': '每个城市最多 3 个时段。',
  'Using default days': '使用默认日期',
  'Custom days': '自定义日期',
  'No available days': '没有可用日期',
  'Use default': '使用默认设置',
  'Explore the day': '浏览一天',
  'Start of day': '一天开始',
  'Drag to find your moment': '拖动查找合适时间',
  'End of day': '一天结束',
  'Outside hours': '非可用时间',
  'Your selection': '当前选择',
  '02 / YOUR SHARED MOMENT': '02 / 共同时间',
  'Meeting recommendations': '会议时间建议',
  'A good time for everyone': '所有人都合适',
  'Save calendar invite': '保存日历邀请',
  'Copy plan link': '复制计划链接',
  'Save text summary': '保存文字摘要',
  'Room to connect': '可以相聚的时间',
  'No shared window yet': '暂时没有共同时间',
  'Check days & hours': '检查日期和时段',
  'Someone would be outside their available hours. Adjust a city’s days or hours, shorten the meeting, or try another date.': '有人会处于可用时间之外。可以调整城市的日期或时段、缩短会议，或尝试其他日期。',
  'Compare 7 days': '比较未来 7 天',
  'Closest options': '最接近的选择',
  'Most cities fully within hours first; ties minimize the worst individual cost, then total minutes outside hours.': '优先让更多城市完全处于可用时间；若相同，再依次减少单个城市和全部城市超出的分钟数。',
  'All times adjust for daylight saving.': '所有时间都会自动适配夏令时。',
  'Set your own hours.': '设置自己的时间。',
  'Early bird, night owl, or somewhere in between. Adjust each city’s availability.': '无论早起还是晚睡，都可以分别调整每个城市的可用时间。',
  'Keep the whole meeting in mind.': '考虑完整的会议时长。',
  'A match means your full meeting fits everyone’s hours, including across midnight.': '只有完整会议时长都符合每个人的时间，才算匹配，包括跨午夜的情况。',
  'Make it a date.': '把时间定下来。',
  'Share a link to the same plan, or save a calendar file. No sign-up required.': '分享同一个计划链接，或保存日历文件，无需注册。',
  'overlap / a little more in sync.': 'overlap / 让彼此更同步。',
  '/ a little more in sync.': '/ 让彼此更同步。',
  'How it works & privacy': '工作原理与隐私',
  'Times use your browser’s IANA time-zone database, including daylight saving rules. The planner checks 15-minute intervals. Availability combines up to three daily windows per city; gaps stay unavailable and equal start and end means all day. Selected days follow each city’s local date; custom city days override the default; overnight hours belong to the day they start. Calendar files use exact UTC instants.': '时间来自浏览器的 IANA 时区数据库，并包含夏令时规则。规划器按 15 分钟间隔检查。每个城市最多合并三个日常可用时段；间隔保持不可用，起止时间相同表示全天可用。所选日期按各城市的本地日期计算；城市自定义日期会覆盖默认设置；跨夜时段归属于开始的那一天。日历文件使用准确的 UTC 时刻。',
  'Your plan is saved on this device. A shared link includes your cities and availability in its URL fragment. Anyone with that link can read it. There are no accounts, analytics, external fonts or application servers; the static hosting provider handles normal page requests. Browser time-zone rules may need updates when governments change their clocks.': '计划保存在此设备上。分享链接会在 URL 片段中包含城市和可用时间，任何获得链接的人都能读取这些内容。本站没有账户、分析追踪、外部字体或应用服务器；静态托管服务仍会处理普通页面请求。政府调整时制后，浏览器的时区规则可能需要更新。',
  'Reset current plan': '重置当前计划',
  'What’s next ↗': '后续计划 ↗',
  'Add a city': '添加城市',
  'Close city picker': '关闭城市选择器',
  'Search city or time zone': '搜索城市或时区',
  'Try NYC, Kolkata, 东京…': '试试纽约、加尔各答、东京…',
  'One time zone per city · up to six cities': '每个城市一个时区 · 最多六个城市',
  'Your plan link': '你的计划链接',
  'Close share link': '关闭分享链接',
  'Copy this link to share the same date, cities and meeting time.': '复制链接，即可分享相同的日期、城市和会议时间。',
  'Link to your plan': '计划链接',
  'Find a day that works.': '寻找合适的日期。',
  'Close day comparison': '关闭日期比较',
  'Close saved plans': '关闭已保存计划',
  'Save up to 12 snapshots in this browser. Each keeps its date, cities, hours and meeting time.': '可在此浏览器保存最多 12 个快照，每个快照会保留日期、城市、时段和会议时间。',
  'Name this plan': '计划名称',
  'e.g. Design team': '例如：设计团队',
  'Save current plan': '保存当前计划',
  'Names stay on this device and are not included in shared links. Clearing browser data removes these snapshots.': '名称只保存在此设备，不会写入分享链接；清除浏览器数据会删除这些快照。',
  'No saved plans yet.': '还没有保存的计划。',
  'Load': '载入',
  'Remove': '删除',
  'No matching time zone. Try another city in the same region.': '没有匹配的时区，请尝试同一区域的其他城市。',
  'Date does not exist in this city': '该日期在此城市不存在',
  'No match': '没有匹配',
  'English interface': '英文界面',
  'Chinese interface': '中文界面',
  'The link is invalid or incomplete. Your current plan is unchanged.': '链接无效或不完整，当前计划未被更改。',
  'The link is invalid or incomplete. Your current plan is unchanged. Ask the sender for a new link, or continue with the plan below.': '链接无效或不完整，当前计划未被更改。请向发送者索取新链接，或继续使用下方计划。',
  'The link is invalid or incomplete. Your saved preferences are shown below instead. Ask the sender for a new link, or continue with the plan below.': '链接无效或不完整，已改为显示你保存的偏好。请向发送者索取新链接，或继续使用下方计划。',
  'The link is invalid or incomplete. The starter plan is shown below instead. Ask the sender for a new link, or continue with the plan below.': '链接无效或不完整，已改为显示初始计划。请向发送者索取新链接，或继续使用下方计划。',
  'Plan saved in this browser.': '计划已保存在此浏览器中。',
  'Calendar file downloaded. Open it in your calendar app.': '日历文件已下载，可在日历应用中打开。',
  'Plan link copied. Ready to share.': '计划链接已复制，可以分享了。',
  'Text summary downloaded. Ready to share.': '文字摘要已下载，可以分享了。',
  'Partial match selected. Review the cities outside their hours before sharing.': '已选择部分匹配。分享前请检查超出可用时间的城市。',
  'This meeting falls outside the supported dates in that city. Choose another time before changing the base city.': '该会议在此城市中超出支持的日期范围。请先选择其他时间，再更改参考城市。',
  'This meeting falls outside the supported dates in the next base city. Choose another time before removing this city.': '该会议在下一个参考城市中超出支持的日期范围。请先选择其他时间，再删除此城市。',
  'Current plan reset. Named snapshots are unchanged.': '当前计划已重置，已命名的快照不受影响。',
  'Current plan kept. The link now reflects this plan.': '已保留当前计划，链接现已更新。',
  'Shared plan opened.': '已打开共享计划。',
  'Saved plans could not be read. Browser storage may be unavailable; existing data has not been changed.': '无法读取已保存计划。浏览器存储可能不可用，现有数据未被更改。',
  'Saved plans could not be read. Existing data has not been changed.': '无法读取已保存计划，现有数据未被更改。',
  'Invalid saved plans. Existing data has not been changed.': '已保存计划的数据无效，现有数据未被更改。',
  'Invalid saved plan. Existing data has not been changed.': '某个已保存计划无效，现有数据未被更改。',
  'Use a name between 1 and 60 characters.': '请输入 1 至 60 个字符的名称。',
  'That name is already saved. Choose a different name.': '该名称已存在，请换一个名称。',
  'You can save up to 12 plans. Remove one before saving another.': '最多可保存 12 个计划，请先删除一个再保存。',
  'This plan cannot be saved. Check its date and time.': '无法保存此计划，请检查日期和时间。',
  'Could not save. Browser storage may be unavailable.': '无法保存，浏览器存储可能不可用。',
  'Could not remove this plan.': '无法删除此计划。',
  'No full matches in this range. Try changing available days, hours or meeting duration.': '此日期范围内没有完整匹配。请尝试调整可用日期、时段或会议时长。',
  'Choose a suggested start to update the planner. Counts are alternative starts, not separate meetings.': '选择一个建议开始时间即可更新规划器。数量表示可选开始时间，并非多场会议。',
  'Mo': '一', 'Tu': '二', 'We': '三', 'Th': '四', 'Fr': '五', 'Sa': '六', 'Su': '日',
};

const dayNames: Record<string, string> = {
  Sunday: '星期日', Monday: '星期一', Tuesday: '星期二', Wednesday: '星期三',
  Thursday: '星期四', Friday: '星期五', Saturday: '星期六',
};

/** Translate both static copy and the bounded dynamic phrases generated by the planner. */
export function translateText(language: Language, value: string): string {
  if (language === 'en' || !value) return value;
  if (exact[value]) return exact[value];
  let match: RegExpMatchArray | null;
  if ((match = value.match(/^(\d+) minutes$/))) return `${match[1]} 分钟`;
  if ((match = value.match(/^Date & slider follow (.+) · (.+)-hour day$/))) return `日期与时间轴跟随 ${match[1]} · ${match[2]} 小时日`;
  if ((match = value.match(/^(\d+) of (\d+) cities within hours$/))) return `${match[2]} 个城市中有 ${match[1]} 个处于可用时间`;
  if ((match = value.match(/^(\d+) starts$/))) return `${match[1]} 个可选开始时间`;
  if ((match = value.match(/^Suggested starts in (.+)\. Each fits the full (\d+) minutes\.$/))) return `以下为 ${match[1]} 的建议开始时间，每个都能完整容纳 ${match[2]} 分钟。`;
  if ((match = value.match(/^These are not full matches\. Times in (.+)\. Each card names the cities that would be outside their hours\.$/))) return `以下并非完整匹配。时间以 ${match[1]} 为准，每张卡片会列出超出可用时间的城市。`;
  if ((match = value.match(/^(\d+) of (\d+) cities fully within hours$/))) return `${match[2]} 个城市中有 ${match[1]} 个完全处于可用时间`;
  if ((match = value.match(/^(.+): (\d+) min outside hours$/))) return `${match[1]}：超出可用时间 ${match[2]} 分钟`;
  if ((match = value.match(/^Review (.+)$/))) return `查看 ${match[1]}`;
  if ((match = value.match(/^Window (\d+)$/))) return `时段 ${match[1]}`;
  if ((match = value.match(/^(.+) available days$/))) return `${match[1]} 的可用日期`;
  if ((match = value.match(/^(.+) (Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/))) return `${match[1]} ${dayNames[match[2]]}`;
  if ((match = value.match(/^Remove window (\d+) for (.+)$/))) return `删除 ${match[2]} 的时段 ${match[1]}`;
  if ((match = value.match(/^Remove saved plan (.+)$/))) return `删除已保存计划 ${match[1]}`;
  if ((match = value.match(/^Remove (.+)$/))) return `删除 ${match[1]}`;
  if ((match = value.match(/^Use (.+) as base city$/))) return `将 ${match[1]} 设为参考城市`;
  if ((match = value.match(/^Use default days for (.+)$/))) return `让 ${match[1]} 使用默认日期`;
  if ((match = value.match(/^Add availability window for (.+)$/))) return `为 ${match[1]} 添加可用时段`;
  if ((match = value.match(/^Select a time on (.+) timeline$/))) return `在 ${match[1]} 时间轴上选择时间`;
  if ((match = value.match(/^Meeting start time in (.+)$/))) return `${match[1]} 的会议开始时间`;
  if ((match = value.match(/^Load (.+)$/))) return `载入 ${match[1]}`;
  if ((match = value.match(/^Added (.+)\. Set its available hours below\.$/))) return `已添加 ${match[1]}，请在下方设置可用时间。`;
  if ((match = value.match(/^Date and slider now follow (.+)\. The meeting time is unchanged\.$/))) return `日期与时间轴现在跟随 ${match[1]}，会议时刻保持不变。`;
  if ((match = value.match(/^Loaded (.+) · (.+)\.$/))) return `已载入 ${match[1]} · ${match[2]}。`;
  if ((match = value.match(/^Removed (.+)\. The current planner is unchanged\.$/))) return `已删除 ${match[1]}，当前规划器未被更改。`;
  if ((match = value.match(/^Selected (.+) · (.+)\. Fits every city\.$/))) return `已选择 ${match[1]} · ${match[2]}，适合所有城市。`;
  if ((match = value.match(/^Choose an existing date in (.+) between 2000 and 2099\.$/))) return `请选择 ${match[1]} 中 2000 至 2099 年之间真实存在的日期。`;
  if ((match = value.match(/^(\d+) dates starting (.+), in (.+)\. Each possible start fits the full (\d+) minutes for every city\. Times below follow (.+)\.$/))) return `从 ${match[2]} 开始比较 ${match[1]} 个日期，以 ${match[3]} 为准。每个可选开始时间都能让所有城市完整容纳 ${match[4]} 分钟；下方时间跟随 ${match[5]}。`;
  if ((match = value.match(/^(\d+) possible starts$/))) return `${match[1]} 个可选开始时间`;
  if ((match = value.match(/^Choose (.+)$/))) return `选择 ${match[1]}`;
  if ((match = value.match(/^(.+) availability (start|end)$/))) return `${match[1]} 可用时间${match[2] === 'start' ? '开始' : '结束'}`;
  if ((match = value.match(/^(.+) window (\d+) (start|end)$/))) return `${match[1]} 时段 ${match[2]} ${match[3] === 'start' ? '开始' : '结束'}`;
  const skipped = '. The original time does not exist on this date; moved to the next available time.';
  if (value.endsWith(skipped)) return `${value.slice(0, -skipped.length)}。原来的时间在该日期不存在，已移到下一个可用时间。`;
  return value;
}
