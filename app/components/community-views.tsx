"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Board = "notice" | "bamboo";
type CommunityPostSummary = { id: string; board: Board; title: string; excerpt: string; authorLabel: string; pinned: boolean; commentCount: number; viewCount: number; createdAt: string; updatedAt: string };
type CommunityPostDetail = CommunityPostSummary & { content: string };
type CommunityComment = { id: string; content: string; authorLabel: string; mine: boolean; createdAt: string };
type CommunityListPayload = { posts: CommunityPostSummary[] };
type CommunityDetailPayload = { post: CommunityPostDetail; comments: CommunityComment[] };
type SupportCategory = "issue" | "suggestion" | "feedback" | "other";
type SupportStatus = "received" | "in_review" | "resolved" | "closed";
type SupportRequestItem = { id: string; category: SupportCategory; subject: string; content: string; status: SupportStatus; adminResponse: string | null; respondedAt: string | null; createdAt: string; updatedAt: string };
type SupportPayload = { email: string; requests: SupportRequestItem[] };

async function responseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) as T & { error?: string } : null;
  if (!response.ok) throw new Error(payload?.error ?? "요청을 처리하지 못했습니다.");
  return (payload ?? {} as T) as T;
}

const communityDate = (value: string, detail = false) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "방금 전";
  return date.toLocaleString("ko-KR", detail
    ? { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "2-digit", day: "2-digit" });
};

const supportCategoryLabel: Record<SupportCategory, string> = { issue: "오류·이슈", suggestion: "기능 건의", feedback: "서비스 피드백", other: "기타 문의" };
const supportStatusLabel: Record<SupportStatus, string> = { received: "접수", in_review: "검토중", resolved: "답변 완료", closed: "종료" };

export function CustomerSupportView() {
  const [payload, setPayload] = useState<SupportPayload | null>(null);
  const [category, setCategory] = useState<SupportCategory>("issue");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setStatus("loading");
    try {
      const next = await responseJson<SupportPayload>(await fetch("/api/support", { headers: { Accept: "application/json" } }));
      setPayload(next);
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "문의 내역을 불러오지 못했습니다.");
      setStatus("error");
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subject.trim() || !content.trim() || status === "saving") return;
    setStatus("saving");
    setMessage("");
    try {
      const next = await responseJson<SupportPayload>(await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, subject, content }) }));
      setPayload(next);
      setSubject("");
      setContent("");
      setMessage("문의가 접수되었습니다. 처리 현황은 이 화면에서 확인할 수 있어요.");
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "문의를 접수하지 못했습니다.");
      setStatus("error");
    }
  };

  const pendingCount = payload?.requests.filter((item) => item.status === "received" || item.status === "in_review").length ?? 0;
  const resolvedCount = payload?.requests.filter((item) => item.status === "resolved" || item.status === "closed").length ?? 0;
  return <div className="dm-support-page">
    <section className="dm-support-hero"><div><span>DANGMO SUPPORT</span><h2>사용하면서 발견한 점을 당모에 알려주세요.</h2><p>오류·이슈, 기능 건의와 서비스 피드백을 남기면 운영팀이 확인하고 이 화면을 통해 답변드립니다.</p></div><a href="mailto:sseung.chip@gmail.com">긴급 문의 · sseung.chip@gmail.com</a></section>
    <div className="dm-support-layout">
      <form className="dm-support-form" onSubmit={submit}>
        <div className="dm-support-section-head"><div><span>새 문의</span><h2>어떤 도움이 필요하신가요?</h2></div><small>평일 기준 순차 답변</small></div>
        <label><span>문의 유형</span><select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)}>{Object.entries(supportCategoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>제목</span><input value={subject} maxLength={120} placeholder="문의 내용을 한 줄로 알려주세요." onChange={(event) => setSubject(event.target.value)} /></label>
        <label><span>내용</span><textarea value={content} maxLength={5_000} rows={10} placeholder="발생한 상황, 기대한 동작, 개선 제안을 구체적으로 적어주시면 빠르게 확인할 수 있어요." onChange={(event) => setContent(event.target.value)} /></label>
        <div className="dm-support-form-bottom"><small>{content.length.toLocaleString("ko-KR")} / 5,000자 · 문의 계정 {payload?.email ?? "가입 이메일"}</small><button className="dm-primary-button" type="submit" disabled={!subject.trim() || !content.trim() || status === "saving"}>{status === "saving" ? "접수 중…" : "문의 접수하기"}</button></div>
        {message ? <p className={status === "error" ? "dm-support-message is-error" : "dm-support-message"} role="status">{message}</p> : null}
      </form>
      <section className="dm-support-history">
        <div className="dm-support-section-head"><div><span>내 문의</span><h2>처리 현황</h2></div><button className="dm-button" type="button" disabled={status === "loading"} onClick={() => void loadRequests()}>↻ 새로고침</button></div>
        <div className="dm-support-summary"><div><span>답변 대기</span><strong>{pendingCount}건</strong></div><div><span>답변 완료</span><strong>{resolvedCount}건</strong></div></div>
        {status === "loading" && !payload ? <div className="dm-support-empty">문의 내역을 불러오는 중…</div> : null}
        {payload?.requests.length ? <div className="dm-support-request-list">{payload.requests.map((item) => { const expanded = expandedId === item.id; return <article className={expanded ? "is-expanded" : ""} key={item.id}>
          <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? "" : item.id)}><span><b>{supportCategoryLabel[item.category]}</b><i className={`is-${item.status}`}>{supportStatusLabel[item.status]}</i></span><strong>{item.subject}</strong><small>{communityDate(item.createdAt, true)}<em>{expanded ? "접기 ↑" : "내용 보기 ↓"}</em></small></button>
          {expanded ? <div className="dm-support-request-body"><section><h3>문의 내용</h3><p>{item.content}</p></section>{item.adminResponse ? <section className="is-response"><h3>당모 운영팀 답변</h3><p>{item.adminResponse}</p><small>{item.respondedAt ? communityDate(item.respondedAt, true) : "답변 완료"}</small></section> : <section className="is-waiting"><h3>운영팀이 내용을 확인하고 있어요.</h3><p>답변이 등록되면 이 화면에서 확인할 수 있습니다.</p></section>}</div> : null}
        </article>; })}</div> : status !== "loading" ? <div className="dm-support-empty"><strong>아직 접수한 문의가 없습니다.</strong><span>왼쪽 양식에서 첫 문의를 남겨주세요.</span></div> : null}
      </section>
    </div>
  </div>;
}

export function CommunityBoardView({ board }: { board: Board }) {
  const [posts, setPosts] = useState<CommunityPostSummary[]>([]);
  const [selected, setSelected] = useState<CommunityPostDetail | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");

  const loadPosts = useCallback(async () => {
    setStatus("loading"); setError("");
    try { const payload = await responseJson<CommunityListPayload>(await fetch(`/api/community?board=${board}`, { headers: { Accept: "application/json" } })); setPosts(payload.posts); setStatus("ready"); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "게시판을 불러오지 못했습니다."); setStatus("error"); }
  }, [board]);
  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const openPost = async (postId: string) => {
    setStatus("loading"); setError("");
    try { const payload = await responseJson<CommunityDetailPayload>(await fetch(`/api/community?postId=${encodeURIComponent(postId)}`, { headers: { Accept: "application/json" } })); setSelected(payload.post); setComments(payload.comments); setStatus("ready"); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "게시글을 불러오지 못했습니다."); setStatus("error"); }
  };
  const submitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!title.trim() || !content.trim() || status === "saving") return; setStatus("saving"); setError("");
    try { const payload = await responseJson<CommunityDetailPayload>(await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "post", title, content }) })); setTitle(""); setContent(""); setComposeOpen(false); setSelected(payload.post); setComments(payload.comments); setStatus("ready"); void loadPosts(); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "게시글을 저장하지 못했습니다."); setStatus("error"); }
  };
  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected || !comment.trim() || status === "saving") return; setStatus("saving"); setError("");
    try { const payload = await responseJson<CommunityDetailPayload>(await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", postId: selected.id, content: comment }) })); setSelected(payload.post); setComments(payload.comments); setComment(""); setStatus("ready"); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "댓글을 저장하지 못했습니다."); setStatus("error"); }
  };

  if (selected) return <div className="dm-community-page dm-community-detail">
    <button className="dm-community-back" type="button" onClick={() => { setSelected(null); setComments([]); setError(""); void loadPosts(); }}>← {board === "notice" ? "공지사항" : "대나무숲"} 목록</button>
    <article className="dm-community-article"><header><div className="dm-community-tags"><span>{board === "notice" ? "공지사항" : "대나무숲"}</span>{selected.pinned ? <b>고정</b> : null}</div><h2>{selected.title}</h2><p><strong>{selected.authorLabel}</strong><span>{communityDate(selected.createdAt, true)}</span><span>조회 {selected.viewCount.toLocaleString("ko-KR")}</span></p></header><div className="dm-community-body">{selected.content}</div></article>
    {board === "bamboo" ? <section className="dm-community-comments" aria-labelledby="community-comments-title"><div className="dm-community-comments-head"><h2 id="community-comments-title">댓글 <strong>{comments.length}</strong></h2><p>서로의 상황과 선택을 존중하는 댓글을 남겨주세요.</p></div><form className="dm-community-comment-form" onSubmit={submitComment}><span className="dm-community-anonymous-avatar" aria-hidden="true">익</span><label><span className="sr-only">댓글 내용</span><textarea value={comment} maxLength={1_000} rows={3} placeholder="익명으로 댓글을 남겨보세요." onChange={(event) => setComment(event.target.value)} /></label><button className="dm-primary-button" type="submit" disabled={!comment.trim() || status === "saving"}>{status === "saving" ? "등록 중…" : "댓글 등록"}</button></form>{error ? <p className="dm-community-error" role="alert">{error}</p> : null}<div className="dm-community-comment-list">{comments.length ? comments.map((item) => <article key={item.id}><span className="dm-community-anonymous-avatar" aria-hidden="true">익</span><div><p><strong>{item.authorLabel}</strong>{item.mine ? <b>내 댓글</b> : null}<time>{communityDate(item.createdAt, true)}</time></p><div>{item.content}</div></div></article>) : <div className="dm-community-empty-comment">첫 댓글을 남겨보세요.</div>}</div></section> : null}
  </div>;

  return <div className="dm-community-page">
    <section className="dm-community-hero"><div><span>{board === "notice" ? "DANGMO NOTICE" : "DANGMO BAMBOO"}</span><h2>{board === "notice" ? "당모의 새로운 소식과 이용 안내" : "혼자 품고 있던 창업 고민을 익명으로 나눠보세요."}</h2><p>{board === "notice" ? "서비스 업데이트와 꼭 확인해야 할 내용을 전해드립니다." : "사업 아이템, 지원사업 준비와 서류 작성 과정의 경험을 편하게 나누는 공간입니다."}</p></div>{board === "bamboo" ? <button className="dm-primary-button" type="button" onClick={() => setComposeOpen((open) => !open)}>{composeOpen ? "작성 닫기" : "＋ 글쓰기"}</button> : null}</section>
    {composeOpen && board === "bamboo" ? <form className="dm-community-compose" onSubmit={submitPost}><div><span className="dm-badge">익명 작성</span><h2>대나무숲에 이야기 남기기</h2><p>이름과 이메일은 다른 사용자에게 표시되지 않습니다.</p></div><label><span>제목</span><input value={title} maxLength={120} placeholder="어떤 이야기를 나누고 싶나요?" onChange={(event) => setTitle(event.target.value)} /></label><label><span>내용</span><textarea value={content} maxLength={5_000} rows={9} placeholder="상황과 고민을 편하게 적어주세요. 개인정보와 연락처는 제외해주세요." onChange={(event) => setContent(event.target.value)} /></label><div className="dm-community-compose-actions"><small>{content.length.toLocaleString("ko-KR")} / 5,000자</small><button className="dm-button" type="button" onClick={() => setComposeOpen(false)}>취소</button><button className="dm-primary-button" type="submit" disabled={!title.trim() || !content.trim() || status === "saving"}>{status === "saving" ? "게시 중…" : "익명으로 게시하기"}</button></div>{error ? <p className="dm-community-error" role="alert">{error}</p> : null}</form> : null}
    <section className="dm-community-list" aria-live="polite">{status === "loading" ? <div className="dm-community-loading">게시글을 불러오는 중…</div> : null}{status === "error" && !composeOpen ? <div className="dm-community-loading is-error">{error}<button className="dm-button" type="button" onClick={() => void loadPosts()}>다시 불러오기</button></div> : null}{status !== "loading" && posts.length ? posts.map((post) => <button className="dm-community-card" type="button" key={post.id} onClick={() => void openPost(post.id)}><span className="dm-community-card-top"><span>{board === "notice" ? "공지" : "익명"}</span>{post.pinned ? <b>고정</b> : null}</span><strong>{post.title}</strong><p>{post.excerpt}</p><span className="dm-community-card-meta"><b>{post.authorLabel}</b><time>{communityDate(post.createdAt)}</time><span>댓글 {post.commentCount}</span><span>조회 {post.viewCount}</span><em>읽어보기 →</em></span></button>) : null}{status === "ready" && !posts.length ? <div className="dm-community-loading"><strong>{board === "notice" ? "등록된 공지사항이 없습니다." : "아직 작성된 이야기가 없습니다."}</strong><span>{board === "bamboo" ? "첫 번째 이야기를 편하게 남겨보세요." : "새 소식이 등록되면 이곳에서 알려드릴게요."}</span></div> : null}</section>
    {board === "bamboo" ? <p className="dm-community-policy">대나무숲은 로그인 사용자만 이용할 수 있으며, 모든 글과 댓글은 익명으로 표시됩니다. 개인정보·광고·비방·권리 침해 내용은 운영 정책에 따라 제한될 수 있습니다.</p> : null}
  </div>;
}
