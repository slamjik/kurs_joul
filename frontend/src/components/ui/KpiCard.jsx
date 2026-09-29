import React from 'react'
import styles from './KpiCard.module.css'

export function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}) {
  return (
    <div className={`${styles.card} ${styles[variant] || ''}`}>
      <div className={styles.topRow}>
        <span className={styles.label}>{label}</span>
        {Icon && (
          <div className={styles.iconWrapper}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div>
        <div className={styles.valueRow}>
          <span className={styles.value}>{value ?? '—'}</span>
        </div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
    </div>
  )
}
