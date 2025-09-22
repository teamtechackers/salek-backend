export const USER_TABLE = 'users';

export const USER_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${USER_TABLE} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    dob DATE,
    gender ENUM('male', 'female', 'other'),
    country VARCHAR(50),
    address TEXT,
    contact_no VARCHAR(20),
    material_status ENUM('single', 'married', 'divorced', 'widowed'),
    do_you_have_children TINYINT(1) DEFAULT 0,
    how_many_children INT DEFAULT 0,
    are_you_pregnant TINYINT(1) DEFAULT 0,
    pregnancy_detail TEXT,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_phone_number (phone_number)
  )
`;

export const USER_FIELDS = {
  ID: 'id',
  PHONE_NUMBER: 'phone_number',
  FULL_NAME: 'full_name',
  DOB: 'dob',
  GENDER: 'gender',
  COUNTRY: 'country',
  ADDRESS: 'address',
  CONTACT_NO: 'contact_no',
  MATERIAL_STATUS: 'material_status',
  DO_YOU_HAVE_CHILDREN: 'do_you_have_children',
  HOW_MANY_CHILDREN: 'how_many_children',
  ARE_YOU_PREGNANT: 'are_you_pregnant',
  PREGNANCY_DETAIL: 'pregnancy_detail',
  PROFILE_COMPLETED: 'profile_completed',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  IS_ACTIVE: 'is_active'
};
