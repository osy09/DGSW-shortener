'use client';

import { useState, useEffect } from 'react';
import { getAllLinks, createCustomLink, updateLink, deleteLink, logout } from './actions';
import styles from './page.module.css';

export default function AdminDashboard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ originalUrl: '', shortCode: '' });

  async function loadLinks() {
    const result = await getAllLinks();
    result.error ? setError(result.error) : setLinks(result.links || []);
    setLoading(false);
  }

  useEffect(() => { loadLinks(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    const result = await createCustomLink(new FormData(e.target));
    if (result.error) {
      setFormError(result.error);
    } else if (result.success) {
      e.target.reset();
      loadLinks();
    }
  }

  function startEdit(link) {
    setEditingId(link.id);
    setEditData({ originalUrl: link.originalUrl, shortCode: link.shortCode });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({ originalUrl: '', shortCode: '' });
  }

  async function handleUpdate(id) {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('originalUrl', editData.originalUrl);
    formData.append('shortCode', editData.shortCode);

    const result = await updateLink(formData);
    if (result.error) {
      alert(result.error);
    } else {
      setEditingId(null);
      loadLinks();
    }
  }

  async function handleDelete(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const formData = new FormData();
    formData.append('id', id);
    const result = await deleteLink(formData);
    result.error ? alert(result.error) : loadLinks();
  }

  async function handleLogout() {
    await logout();
  }

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>로딩 중...</div></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>로그아웃</button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>새 링크 생성</h2>
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input type="url" name="url" placeholder="원본 URL (https://...)" className={styles.input} required />
          <input type="text" name="shortCode" placeholder="커스텀 코드 (선택사항)" className={styles.inputShort} maxLength={20} />
          <button type="submit" className={styles.createButton}>생성</button>
        </form>
        {formError && <div className={styles.formError}>{formError}</div>}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>링크 목록 ({links.length}개)</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Short Code</th>
                <th>Original URL</th>
                <th>Clicks</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id}>
                  <td>{link.id}</td>
                  <td>
                    {editingId === link.id ? (
                      <input
                        type="text"
                        value={editData.shortCode}
                        onChange={(e) => setEditData({ ...editData, shortCode: e.target.value })}
                        className={styles.editInput}
                      />
                    ) : (
                      <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                        {link.shortCode}
                      </a>
                    )}
                  </td>
                  <td className={styles.urlCell}>
                    {editingId === link.id ? (
                      <input
                        type="url"
                        value={editData.originalUrl}
                        onChange={(e) => setEditData({ ...editData, originalUrl: e.target.value })}
                        className={styles.editInput}
                      />
                    ) : (
                      <span title={link.originalUrl}>{link.originalUrl}</span>
                    )}
                  </td>
                  <td>{link.clicks}</td>
                  <td className={styles.dateCell}>{link.createdAt}</td>
                  <td className={styles.actionsCell}>
                    {editingId === link.id ? (
                      <>
                        <button onClick={() => handleUpdate(link.id)} className={styles.saveButton}>저장</button>
                        <button onClick={cancelEdit} className={styles.cancelButton}>취소</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(link)} className={styles.editButton}>수정</button>
                        <button onClick={() => handleDelete(link.id)} className={styles.deleteButton}>삭제</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
