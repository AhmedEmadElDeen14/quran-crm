import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import Pagination from '../components/ui/Pagination';

function DemoPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [page, setPage] = useState(1);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Alert type="info" className="mb-6">
                هذه رسالة إعلامية مثال.
            </Alert>

            <Card title="مثال على البطاقة">
                <Input label="بحث" placeholder="اكتب هنا..." className="mb-4" />
                <Button onClick={() => setModalOpen(true)} variant="primary" size="md">
                    فتح المودال
                </Button>
            </Card>

            <Modal isOpen={modalOpen} title="عنوان المودال" onClose={() => setModalOpen(false)}>
                <p>هذا نص داخل المودال. يمكنك وضع أي محتوى هنا.</p>
                <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)} className="mt-4">
                    إغلاق
                </Button>
            </Modal>

            <Pagination currentPage={page} totalPages={5} onPageChange={setPage} />
        </div>
    );
}

export default DemoPage;
