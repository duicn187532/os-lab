/* OS 互動挑戰（CSLab.challenge，見 shared/cslab-challenge.js）。
 * 第 5 章 CPU Scheduling：每到一個排程時機（有工作到達或做完）由玩家決定 CPU 交給誰，排完再算平均等待時間。
 * 合法性依排程規則逐步判定，同分（例如剩餘時間相同）時每個都接受；對照用的 Gantt 取自 CSLab.sim.scheduleSim。 */
'use strict';
(function () {
  const X = CSLab.challenge, { h, fmt } = CSLab.ui;
  const NAMES = { SRTF: 'SRTF（最短剩餘時間優先，可搶先）', SJF: 'SJF（最短工作優先，不搶先）', FCFS: 'FCFS（先到先服務）' };
  // 排程規則：在已到達、還沒做完的工作裡比較的鍵；preempt 表示新工作到達時要重新選
  const RULES = { SRTF: { key: (j, s) => s.rem[j.id], preempt: true }, SJF: { key: j => j.burst, preempt: false }, FCFS: { key: j => j.arr, preempt: false } };
  const ready = (s, c) => c.params.jobs.filter(j => j.arr <= s.t && s.rem[j.id] > 0);
  const legal = (s, c) => { const R = RULES[c.rule.algo], r = ready(s, c), best = Math.min(...r.map(j => R.key(j, s))); return r.filter(j => R.key(j, s) === best); };
  // CPU 沒有工作可做時直接往後跳到下一個到達時間（閒置不需要決定）
  function idle(s, c) {
    while (!ready(s, c).length && c.params.jobs.some(j => s.rem[j.id] > 0)) { s.trace.push('idle'); s.t++; }
  }
  // 依玩家自己的 Gantt 算出每個工作的完成、周轉與等待時間
  function rows(s, c) {
    return c.params.jobs.map(j => { const ct = s.trace.lastIndexOf(j.id) + 1, tat = ct - j.arr; return { id: j.id, arr: j.arr, burst: j.burst, ct, tat, wt: tat - j.burst }; });
  }
  const avgWt = (s, c) => { const r = rows(s, c); return r.reduce((a, x) => a + x.wt, 0) / r.length; };
  const cls = (c, id) => id === 'idle' ? 'idle' : 'j' + c.params.jobs.findIndex(j => j.id === id);
  const gantt = (c, trace) => !trace.length ? '<p class="muted small">（還沒有排任何工作）</p>' : `<div class="gantt-scroll"><div class="gantt" style="--n:${trace.length}">${trace.map((id, i) => `<div class="cell ${cls(c, id)}" title="t=${i}"><b>${id === 'idle' ? '·' : id}</b></div>`).join('')}</div><div class="gantt-axis" style="--n:${trace.length}">${trace.map((_, i) => `<span>${i}</span>`).join('')}<span>${trace.length}</span></div></div>`;

  X.type('sched-pick', {
    init(c) {
      const s = { t: 0, trace: [], rem: Object.fromEntries(c.params.jobs.map(j => [j.id, j.burst])), ties: [], answer: '', round: 0, rounds: 2, done: false };
      idle(s, c);
      return s;
    },
    view(s, c) {
      const jobs = c.params.jobs;
      const table = `<div class="table-wrap"><table class="table compact"><thead><tr><th>工作</th><th>到達 AT</th><th>CPU burst BT</th></tr></thead><tbody>${jobs.map((j, i) => `<tr><td><span class="chip j${i}">${j.id}</span></td><td>${j.arr}</td><td>${j.burst}</td></tr>`).join('')}</tbody></table></div>`;
      const chart = `<div class="board-title">你排出的 Gantt Chart</div>${gantt(c, s.trace)}`;
      if (s.round === 0) return `${table}${chart}
        <p class="ch-goal">t = <b>${s.t}</b>：依 ${h(NAMES[c.rule.algo])}，CPU 要交給誰？</p>
        <div class="row ch-choices" role="group" aria-label="選擇下一個執行的工作">${jobs.map((j, i) => `<button type="button" class="btn secondary sm" data-ch-act="pick" data-arg="${j.id}"${s.rem[j.id] > 0 ? '' : ' disabled'}><span class="chip j${i}">${j.id}</span>${s.rem[j.id] > 0 ? '' : ' 已完成'}</button>`).join('')}</div>
        <p class="muted small">選定之後，它會一直執行到下一個排程時機（有新工作到達，或它做完）。剩餘時間要自己從表格和 Gantt 推算。</p>`;
      return `${table}${chart}
        ${s.done ? `<p class="ch-goal">平均等待時間 = <b>${fmt(avgWt(s, c))}</b></p>` : `<p class="ch-goal">排完了。這組排程的<b>平均等待時間</b>是多少？</p>
        <div class="row"><label class="field inline"><span>平均 WT</span><input class="num" type="text" inputmode="decimal" data-ch-set="answer" value="${h(s.answer)}" aria-label="平均等待時間" autocomplete="off" placeholder="例如 2.5 或 5/2"></label><button type="button" class="btn primary sm" data-ch-act="check" data-ch-enter>驗證</button></div>`}`;
    },
    act(s, a, arg, c) {
      if (a === 'set:answer') { s.answer = String(arg).slice(0, 20); return {}; }
      if (a === 'check' && s.round === 1) {
        const v = X.num.parse(s.answer);
        if (!Number.isFinite(v)) return { ok: undefined, msg: '請輸入數字，可以寫小數或分數（例如 13/4）。' };
        if (!X.num.close(v, avgWt(s, c), c.rule.tol)) return { ok: false, msg: `${s.answer} 不對。從 Gantt 讀出每個工作最後一格的結束時間 CT，WT = CT − AT − BT，全部加起來再除以 ${c.params.jobs.length}。` };
        s.round = 2; s.done = true;
        return { ok: true, round: true, done: true, msg: `答對了：平均等待時間 ${fmt(avgWt(s, c))}。` };
      }
      if (a !== 'pick' || s.round !== 0) return {};
      const j = c.params.jobs.find(x => x.id === arg);
      if (!j || s.rem[j.id] <= 0) return {};
      if (j.arr > s.t) return { ok: false, msg: `${j.id} 在 t = ${j.arr} 才到達，現在 t = ${s.t} 還不能執行它。` };
      const ok = legal(s, c);
      if (!ok.includes(j)) return { ok: false, msg: c.rule.algo === 'SRTF' ? `${j.id} 不是目前剩餘時間最短的工作。SRTF 比的是「還剩多少」，不是原本的 burst：已經跑過的格數要扣掉。` : `依 ${c.rule.algo} 的規則，現在不該選 ${j.id}。` };
      if (ok.length > 1) s.ties.push({ t: s.t, ids: ok.map(x => x.id), pick: j.id });
      // 執行到下一個排程時機
      const nextArr = Math.min(...c.params.jobs.filter(x => x.arr > s.t).map(x => x.arr));
      const until = RULES[c.rule.algo].preempt ? Math.min(s.t + s.rem[j.id], nextArr) : s.t + s.rem[j.id], from = s.t;
      while (s.t < until) { s.trace.push(j.id); s.rem[j.id]--; s.t++; }
      idle(s, c);
      if (c.params.jobs.every(x => s.rem[x.id] === 0)) { s.round = 1; return { ok: true, round: true, msg: `${j.id} 執行 t = ${from}–${until}，所有工作都做完了。` }; }
      return { ok: true, msg: `${j.id} 執行 t = ${from}–${until}${s.rem[j.id] ? `，在 t = ${until} 有新工作到達，重新排程` : '，做完了'}。${ok.length > 1 ? `（${ok.map(x => x.id).join('、')} 剩餘時間相同，選哪一個都合法。）` : ''}` };
    },
    solution(c, s) {
      const sim = CSLab.sim.scheduleSim(c.params.jobs, c.rule.algo), simAvg = sim.rows.reduce((a, x) => a + x.wt, 0) / sim.rows.length;
      const mine = s.trace.length && c.params.jobs.every(j => s.rem[j.id] === 0) ? rows(s, c) : null;
      return `${mine ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>工作</th><th>CT</th><th>TAT = CT − AT</th><th>WT = TAT − BT</th></tr></thead><tbody>${mine.map(r => `<tr><td>${r.id}</td><td>${r.ct}</td><td>${r.ct} − ${r.arr} = <b>${r.tat}</b></td><td>${r.tat} − ${r.burst} = <b>${r.wt}</b></td></tr>`).join('')}</tbody></table></div>` : ''}
        <div class="board-title">模擬器的排法（同分時選較早到達的工作）</div>${gantt(c, sim.trace)}
        <p>模擬器的平均等待時間 = ${fmt(simAvg)}。${s.ties.length ? `你在 ${s.ties.map(x => `t = ${x.t}（${x.ids.join('、')} 同分，你選了 ${x.pick}）`).join('、')}遇到同分；兩種排法順序不同，但同分的工作互換時總等待時間不變，所以平均 WT 一樣。` : ''}</p>`;
    }
  });

  X.add({
    id: 'os.cpu-scheduling.srtf-pick', lesson: 4, kind: 'step', ui: 'sched-pick',
    title: '這一刻，CPU 該交給誰？',
    task: '四個工作陸續到達。用 SRTF 排程：每次有工作到達或做完，就由你決定接下來執行哪一個，排出完整的 Gantt 圖，再算出平均等待時間。',
    params: { jobs: [{ id: 'P1', arr: 0, burst: 7 }, { id: 'P2', arr: 2, burst: 4 }, { id: 'P3', arr: 4, burst: 1 }, { id: 'P4', arr: 5, burst: 5 }] },
    rule: { algo: 'SRTF', tol: 0.01 },
    hints: ['每個排程時機只看「已經到達、還沒做完」的工作。', '剩餘時間 = BT − 這個工作在 Gantt 上已經跑過的格數。SRTF 選剩餘最短的；新到的工作比較短就搶先。', 'WT = CT − AT − BT；CT 是這個工作最後一格的結束時間。'],
    explain: 'SRTF 只在排程時機（新工作到達、目前工作做完）重新比較剩餘時間，剩餘最短的先做，所以短工作 P3 一到就能插隊，平均等待時間在所有排程裡最小。代價是要能預知 burst，而且短工作源源不絕時，長工作（例如 P4、P1）會一直被延後。',
    tags: ['cpu-scheduling', 'SRTF', 'preemption', 'waiting-time', 'gantt']
  });
})();
