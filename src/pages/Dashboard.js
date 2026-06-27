<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
  <button className="btn btn-sm" onClick={() => nav('biz-detail')}>View</button>
  <button
    className="btn btn-sm"
    style={{ background: '#DDF4EC', borderColor: '#0A6B52', color: '#0A6B52' }}
    onClick={() => nav('catalogue')}
  >Catalogue</button>
  <button className="btn btn-sm" onClick={() => nav('create')}>Edit</button>
  <button
    className="btn btn-sm"
    style={{ color: '#E03535', borderColor: '#E03535' }}
    onClick={() => delistBusiness(biz.id)}
  >Delist</button>
</div>
