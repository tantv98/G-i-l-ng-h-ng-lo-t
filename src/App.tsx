import React, { useState, useRef } from 'react';
import { 
  Mail, 
  Users, 
  FileText, 
  Settings, 
  Send, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Eye,
  ChevronRight,
  Download
} from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

interface Employee {
  [key: string]: string;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

interface SMTPConfig {
  host: string;
  port: string;
  user: string;
  pass: string;
  fromName: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'employees' | 'template' | 'settings' | 'send'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [template, setTemplate] = useState<EmailTemplate>({
    subject: 'Thông báo lương tháng {{month}} - {{name}}',
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Phiếu Lương Nhân Viên</h2>
        <p>Chào <strong>{{name}}</strong>,</p>
        <p>Dưới đây là chi tiết lương của bạn trong tháng {{month}}:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Lương cơ bản</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">{{base_salary}} VNĐ</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Phụ cấp</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">{{allowance}} VNĐ</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">Thưởng</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">{{bonus}} VNĐ</td>
          </tr>
          <tr style="background: #eff6ff;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 700; color: #1d4ed8;">Thực lĩnh</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 700; color: #1d4ed8;">{{total}} VNĐ</td>
          </tr>
        </table>
        
        <p style="color: #6b7280; font-size: 14px;">Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ phòng nhân sự.</p>
        <p style="margin-top: 20px;">Trân trọng,<br><strong>Phòng Nhân Sự</strong></p>
      </div>
    `
  });
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>({
    host: 'smtp.gmail.com',
    port: '587',
    user: '',
    pass: '',
    fromName: 'Phòng Nhân Sự'
  });
  const [pdfConfig, setPdfConfig] = useState({
    enabled: false,
    passwordField: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<{ email: string; status: string; error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setEmployees(results.data as Employee[]);
        },
      });
    }
  };

  const sendEmails = async () => {
    if (employees.length === 0) return alert('Vui lòng tải lên danh sách nhân viên');
    if (!smtpConfig.user || !smtpConfig.pass) return alert('Vui lòng cấu hình SMTP trong phần Cài đặt');

    setIsSending(true);
    setSendResults([]);

    try {
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees, template, smtpConfig, pdfConfig }),
      });

      const data = await response.json();
      setSendResults(data.results);
      setActiveTab('send');
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('Có lỗi xảy ra khi gửi email');
    } finally {
      setIsSending(false);
    }
  };

  const downloadSampleCSV = () => {
    const csv = Papa.unparse([
      { name: 'Nguyen Van A', email: 'a@example.com', month: '03/2024', base_salary: '15,000,000', allowance: '1,000,000', bonus: '500,000', total: '16,500,000', id: 'NV001', department: 'Kỹ thuật' },
      { name: 'Tran Thi B', email: 'b@example.com', month: '03/2024', base_salary: '12,000,000', allowance: '800,000', bonus: '200,000', total: '13,000,000', id: 'NV002', department: 'Kế toán' },
    ]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'sample_salary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPreviewPDF = async (employee: Employee) => {
    try {
      const response = await fetch('/api/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee, pdfConfig }),
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Phieu_Luong_${employee.name || 'Nhan_Vien'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Có lỗi xảy ra khi tải xuống PDF');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E5E7EB] z-10 hidden md:block">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Mail size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SalaryMail</h1>
          </div>
          
          <nav className="space-y-1">
            <SidebarItem 
              icon={<Users size={20} />} 
              label="Nhân viên" 
              active={activeTab === 'employees'} 
              onClick={() => setActiveTab('employees')} 
            />
            <SidebarItem 
              icon={<FileText size={20} />} 
              label="Mẫu Email" 
              active={activeTab === 'template'} 
              onClick={() => setActiveTab('template')} 
            />
            <SidebarItem 
              icon={<Settings size={20} />} 
              label="Cài đặt SMTP" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
            <SidebarItem 
              icon={<Send size={20} />} 
              label="Trạng thái gửi" 
              active={activeTab === 'send'} 
              onClick={() => setActiveTab('send')} 
            />
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="md:ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#111827]">
                {activeTab === 'employees' && 'Danh sách nhân viên'}
                {activeTab === 'template' && 'Thiết kế mẫu Email'}
                {activeTab === 'settings' && 'Cấu hình hệ thống'}
                {activeTab === 'send' && 'Kết quả gửi lương'}
              </h2>
              <p className="text-[#6B7280] mt-1">
                {activeTab === 'employees' && `Đã tải lên ${employees.length} nhân viên`}
                {activeTab === 'template' && 'Sử dụng {{key}} để chèn dữ liệu từ CSV'}
                {activeTab === 'settings' && 'Thông tin máy chủ gửi thư'}
                {activeTab === 'send' && 'Theo dõi tiến trình gửi thư hàng loạt'}
              </p>
            </div>
            
            {activeTab === 'employees' && (
              <div className="flex gap-3">
                {employees.length > 0 && (
                  <button 
                    onClick={() => downloadPreviewPDF(employees[0])}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Eye size={18} />
                    Xem thử PDF
                  </button>
                )}
                <button 
                  onClick={downloadSampleCSV}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download size={18} />
                  Mẫu CSV
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Upload size={18} />
                  Tải lên CSV
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv" 
                  className="hidden" 
                />
              </div>
            )}

            {activeTab !== 'send' && employees.length > 0 && (
              <button 
                onClick={sendEmails}
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Gửi lương ngay
              </button>
            )}
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'employees' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                  {employees.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#F9FAFB] border-bottom border-[#E5E7EB]">
                            {Object.keys(employees[0]).map((key) => (
                              <th key={key} className="px-6 py-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {employees.map((emp, idx) => (
                            <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                              {Object.values(emp).map((val, i) => (
                                <td key={i} className="px-6 py-4 text-sm text-[#374151]">
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-20 text-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload size={32} />
                      </div>
                      <h3 className="text-lg font-semibold text-[#111827]">Chưa có dữ liệu</h3>
                      <p className="text-[#6B7280] max-w-xs mx-auto mt-2">
                        Hãy tải lên file CSV chứa thông tin lương của nhân viên để bắt đầu.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'template' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                      <label className="block text-sm font-semibold text-[#374151] mb-2">Tiêu đề Email</label>
                      <input 
                        type="text" 
                        value={template.subject}
                        onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                        className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                      <label className="block text-sm font-semibold text-[#374151] mb-2">Nội dung (HTML)</label>
                      <textarea 
                        value={template.body}
                        onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                        rows={15}
                        className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText className="text-blue-600" size={20} />
                          <label className="text-sm font-semibold text-[#374151]">Đính kèm PDF bảo mật</label>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={pdfConfig.enabled}
                            onChange={(e) => setPdfConfig({ ...pdfConfig, enabled: e.target.checked })}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      {pdfConfig.enabled && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="space-y-4 pt-2 border-t border-gray-100"
                        >
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Trường dữ liệu dùng làm mật khẩu</label>
                            <select 
                              value={pdfConfig.passwordField}
                              onChange={(e) => setPdfConfig({ ...pdfConfig, passwordField: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              <option value="">Không đặt mật khẩu</option>
                              {employees.length > 0 && Object.keys(employees[0]).map(key => (
                                <option key={key} value={key}>{key}</option>
                              ))}
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1 italic">
                              * Nhân viên sẽ cần nhập giá trị của cột này để mở file PDF đính kèm.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-widest">Xem trước (Preview)</h3>
                    <div 
                      className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm min-h-[500px]"
                      dangerouslySetInnerHTML={{ 
                        __html: employees.length > 0 
                          ? Object.keys(employees[0]).reduce((acc, key) => acc.replaceAll(`{{${key}}}`, employees[0][key]), template.body)
                          : template.body 
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-2xl bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-[#374151] mb-2">Tên người gửi (From Name)</label>
                      <input 
                        type="text" 
                        value={smtpConfig.fromName}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                        className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#374151] mb-2">SMTP Host</label>
                      <input 
                        type="text" 
                        value={smtpConfig.host}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                        className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#374151] mb-2">SMTP Port</label>
                      <input 
                        type="text" 
                        value={smtpConfig.port}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                        className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-[#374151] mb-2">Email (User)</label>
                      <input 
                        type="email" 
                        value={smtpConfig.user}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                        placeholder="example@gmail.com"
                        className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-[#374151] mb-2">Mật khẩu ứng dụng (App Password)</label>
                      <input 
                        type="password" 
                        value={smtpConfig.pass}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                        className="w-full px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-xs text-[#6B7280] mt-2">
                        * Đối với Gmail, hãy sử dụng "Mật khẩu ứng dụng" (App Password) thay vì mật khẩu chính.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'send' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center">
                    <h3 className="font-bold text-lg">Lịch sử gửi gần nhất</h3>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 size={16} />
                        Thành công: {sendResults.filter(r => r.status === 'success').length}
                      </span>
                      <span className="flex items-center gap-1 text-rose-600 font-medium">
                        <AlertCircle size={16} />
                        Thất bại: {sendResults.filter(r => r.status === 'failed').length}
                      </span>
                    </div>
                  </div>
                  
                  {sendResults.length > 0 ? (
                    <div className="divide-y divide-[#E5E7EB]">
                      {sendResults.map((result, idx) => (
                        <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            {result.status === 'success' ? (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <CheckCircle2 size={18} />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                                <AlertCircle size={18} />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-[#111827]">{result.email}</p>
                              {result.error && <p className="text-xs text-rose-500 mt-0.5">{result.error}</p>}
                            </div>
                          </div>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                            result.status === 'success' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {result.status === 'success' ? 'Đã gửi' : 'Lỗi'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-20 text-center text-[#6B7280]">
                      Chưa có tiến trình gửi nào được thực hiện.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        active 
          ? "bg-blue-50 text-blue-600 shadow-sm" 
          : "text-[#4B5563] hover:bg-gray-50 hover:text-[#111827]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
