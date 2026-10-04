/**
 * Sample CSV Templates for Bulk Import (Students, Staff, Borrow Records)
 */

const CSV_TEMPLATES = {
  students: `register_number,id_card_number,full_name,department,year,section,email,phone,advisor_name,advisor_emp_id,advisor_email,advisor_phone
IT2026101,SVCE-IT-101,Aakash Raman,Information Technology,IV Year,A,aakash.r@svce.ac.in,+91 98401 11224,V Praveenkumar,EMP-FA-IT-01,praveenkumar.v@svce.ac.in,+91 98401 11223
IT2026102,SVCE-IT-102,Bhavana Suresh,Information Technology,IV Year,B,bhavana.s@svce.ac.in,+91 98401 11225,N.Selvaganesh,EMP-FA-IT-02,selvaganesh.n@svce.ac.in,+91 98402 22334`,

  staff: `employee_id,full_name,role,department,designation,email,phone
EMP-LIB-IT-02,K. Ramesh,library_staff,Information Technology,Assistant Librarian,ramesh.k@svce.ac.in,+91 94450 99888
EMP-FA-IT-05,Dr. M. Geetha,faculty_advisor,Information Technology,Associate Professor & Faculty Advisor,geetha.m@svce.ac.in,+91 98405 55667
EMP-DPC-IT-02,Dr. S. Karthi,dpc,Information Technology,Assistant Placement Officer,karthi.s@svce.ac.in,+91 94455 11224`,

  borrow_records: `register_number,book_id,issue_date,due_date,return_date,fine_amount,status,fine_status
IT2024003,BK-IT-101,2026-08-01,2026-08-15,,25.00,Issued,Unpaid
IT2024004,BK-IT-103,2026-07-10,2026-07-25,2026-07-24,0.00,Returned,None`
};

function getTemplate(type) {
  if (!type || typeof type !== 'string') return null;
  const normalized = type.toLowerCase().replace(/-/g, '_');
  return CSV_TEMPLATES[normalized] || null;
}

module.exports = {
  CSV_TEMPLATES,
  getTemplate
};
